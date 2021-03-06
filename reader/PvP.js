class LoadStatePvP extends State {
	/**
	* Load state for PvP mode
	* @param {StateManager} stateManager - State manager
	* @param {CGFscene} scene - Scene
	* @param {Board} board - The game board
	* @param {String} faction - The current faction
	* @constructor
	*/
	constructor(stateManager, scene, board, faction) {
		super(stateManager, scene);
		console.log('Entered LoadStatePvP ...');
		this.board = board;

		if (faction === 'factionOne') {
			this.stateManager.beginCameraRotation();
			this.faction = 'factionTwo';
		} else {
			this.stateManager.beginCameraRotation();
			this.faction = 'factionOne';
		}

		this.previousFaction = faction;
		this.loaded = false;

		let self = this;
		if (board.board.length === 0) {
			board.load(function() {
				// TODO: GAME FILM TEST, PLEASE IGNORE
				self.stateManager.film.addPlay(faction, board.board);

				self.stateManager.overlay.pauseStopWatch(self.faction);
				self.stateManager.overlay.resetStopWatch(self.faction);
				self.stateManager.overlay.resetStopWatch(faction);
				self.stateManager.overlay.beginStopWatch(faction);
				
				self.stateManager.changeState(new ShipPickStatePvP(self.stateManager, self.scene, board, faction));
			});
		} else {
			board.initBoard();
			this.loaded = true;
		}
	}

	/**
	* Updates state
	* @param {Number} dt - Delta time
	*/
	update(dt) {
		if (this.loaded) {
			// TODO: GAME FILM TEST, PLEASE IGNORE
			this.stateManager.film.addPlay(this.faction, this.board.board);

			this.stateManager.overlay.pauseStopWatch(this.previousFaction);
			this.stateManager.overlay.resetStopWatch(this.previousFaction);
			this.stateManager.overlay.resetStopWatch(this.faction);
			this.stateManager.overlay.beginStopWatch(this.faction);
			
			this.stateManager.changeState(new ShipPickStatePvP(this.stateManager, this.scene, this.board, this.faction));
		}
	}

	/** Renders state */
	draw() {
		if (this.board.board.length !== 0) {
			this.board.display();
		}
	}
}

class ShipPickStatePvP extends State {
	/**
	* Ship pick state for pvp mode
	* @param {StateManager} stateManager - State manager
	* @param {CGFscene} scene - Scene
	* @param {Board} board - The game board
	* @param {String} faction - The current faction
	* @constructor
	*/
	constructor(stateManager, scene, board, faction) {
		super(stateManager, scene);
		console.log('Entered ShipPickStatePvP ...');
		this.board = board;
		this.faction = faction;

		this.board.registerShipsForPicking(faction);

		this.beganUndoAnimation = false;
	}

	/** Renders state */
	draw() {
		this.board.display();
	}

	/**
	* Updates state
	* @param {Number} dt - Delta time
	*/
	update(dt) {
		this.board.update(dt);
		
		if (this.beganUndoAnimation) {
			let play = this.stateManager.film.getPreviousPlay();
			if (play.struct === 'colony') {
				if (this.board.getAuxColony(play.faction).animation.finished) {
					this.board.getAuxColony(play.faction).undoAnimationOffset = null;
					this.board.board = play.newBoard;
					this.stateManager.film.goBackOne();

					this.stateManager.overlay.pauseStopWatch(this.faction);
					this.stateManager.overlay.resetStopWatch(this.faction);
					this.stateManager.overlay.resetStopWatch(play.faction);
					this.stateManager.overlay.beginStopWatch(play.faction);
					
					this.stateManager.changeState(new StructBuildStatePvP(this.stateManager, this.scene, this.board, play.faction, play.to));
				}
			} else {
				if (this.board.getAuxTradeStation(play.faction).animation.finished) {
					this.board.getAuxTradeStation(play.faction).undoAnimationOffset = null;
					this.board.board = play.newBoard;
					this.stateManager.film.goBackOne();

					this.stateManager.overlay.pauseStopWatch(this.faction);
					this.stateManager.overlay.resetStopWatch(this.faction);
					this.stateManager.overlay.resetStopWatch(play.faction);
					this.stateManager.overlay.beginStopWatch(play.faction);

					this.stateManager.changeState(new StructBuildStatePvP(this.stateManager, this.scene, this.board, play.faction, play.to));
				}
			}
		}
	}

	/**
	* Handles input
	* @param {Number} keycode - Key code
	*/
	handleInput(keycode) {
		if (!this.beganUndoAnimation) {
			let selectedCell = this.getPickedCell();
			if (selectedCell !== null && selectedCell.pickable) {
				this.board.resetPickRegistration();
				this.board.selectCell(selectedCell.position);
				this.stateManager.changeState(new MovePickStatePvP(this.stateManager, this.scene, this.board, this.faction, selectedCell));
			}

			if (keycode === 37) {
				this.undo();
			}
		}
	}

	/** Undoes play */
	undo() {
		if (!this.beganUndoAnimation) {
			let play = this.stateManager.film.getPreviousPlay();
			if (play) {
				this.board.board[play.to.z][play.to.x][2] = ' ';
				this.stateManager.beginCameraRotation();

				if (play.struct === 'colony') {
					this.board.pushAuxColony(play.faction);

					let src = this.board.getAuxColonyPosition(play.faction);
					let dest = this.board.getScenePosition(play.to);
					let pls = {x: dest.x - src.x, y: dest.y - src.y, z: dest.z - src.z};
					
					this.board.getAuxColony(play.faction).animation = new HopAnimation(1, dest, src);
					this.board.getAuxColony(play.faction).undoAnimationOffset = pls;
					this.board.getAuxColony(play.faction).animation.play();
					this.beganUndoAnimation = true;
				} else {
					this.board.pushAuxTradeStation(play.faction);

					let src = this.board.getAuxTradeStationPosition(play.faction);
					let dest = this.board.getScenePosition(play.to);
					let pls = {x: dest.x - src.x, y: dest.y - src.y, z: dest.z - src.z};

					this.board.getAuxTradeStation(play.faction).animation = new HopAnimation(1, dest, src);
					this.board.getAuxTradeStation(play.faction).undoAnimationOffset = pls;
					this.board.getAuxTradeStation(play.faction).animation.play();
					this.beganUndoAnimation = true;
				}
			} else {
				this.stateManager.overlay.alert('Can\'t undo anymore', 700);
			}
		}
	}

	/** Returns picked cell */
	getPickedCell() {
		let self = this;
		let cell = null;
		if (this.scene.pickMode === false && this.scene.pickResults !== null) {
			this.scene.pickResults.forEach(function(result) {
				let pickId = result[1];
				cell = self.board.getCellByPickId(pickId);
			});
			this.scene.pickResults.splice(0, this.scene.pickResults.length);
		}
		return cell;
	}
}

class MovePickStatePvP extends State {
	/**
	* Move pick state for PvP mode
	* @param {StateManager} stateManager - State manager
	* @param {CGFscene} scene - Scene
	* @param {Board} board - The game board
	* @param {String} faction - The current faction
	* @param {Cell} selected - The selected cell
	* @constructor
	*/
	constructor(stateManager, scene, board, faction, selected) {
		super(stateManager, scene);
		console.log('Entered MovePickStatePvP ...')
		this.board = board;
		this.faction = faction;
		this.selected = selected;

		this.board.initBoard();
		this.board.selectCell(selected.position);

		let connection = new Connection();
		let possibleBoards = null;

		let self = this;
		connection.shipPossibleMovementsRequest(faction, board, selected.position, function(data) {
			possibleBoards = parseStringArray(data.target.response);
			let moves = self.getPossibleMovements(possibleBoards);
			moves.forEach(function(position) {
				self.board.registerCellForPicking(position);
			});
		});
	}

	/** Renders the state */
	draw() {
		this.scene.clearPickRegistration();
		this.board.display();
	}

	/**
	* Handles input
	* @param {Number} keycode - Key code
	*/
	handleInput(keycode) {
		let selectedCell = this.getPickedCell();
		if (selectedCell !== null && selectedCell.pickable) {
			this.board.resetPickRegistration();
			this.board.resetSelection();
			this.stateManager.changeState(new MoveShipStatePvP(this.stateManager, this.scene, this.board, this.faction, this.selected.position, selectedCell.position));
		} else if (selectedCell !== null && !selectedCell.pickable) {
			this.board.resetPickRegistration();
			this.board.resetSelection();
			this.stateManager.changeState(new ShipPickStatePvP(this.stateManager, this.scene, this.board, this.faction));
		}

		if (keycode === 37) {
			this.undo();
		}
	}

	/** Undoes play */
	undo() {
		this.board.resetPickRegistration();
		this.board.resetSelection();
		this.board.board = this.stateManager.film.getPlay().prevBoard;
		this.stateManager.changeState(new ShipPickStatePvP(this.stateManager, this.scene, this.board, this.stateManager.film.getPlay().faction));
	}

	/**
	* Returns possible movements from boards
	* @param {Array} possibleBoards - Array of boards
	*/
	getPossibleMovements(possibleBoards) {
		let movements = [];
		let self = this;
		possibleBoards.forEach(function(possibility) {
			for (let i = 0; i < possibility.length; i++) {
				for (let j = 0; j < possibility.length; j++) {
					if (possibility[i][j][0] === 'A' && self.board.board[i][j][0] !== 'A') {
						movements.push({x: j, z: i});
					}
					if (possibility[i][j][0] === 'B' && self.board.board[i][j][0] !== 'B') {
						movements.push({x: j, z: i});
					}
				}
			}
		});
		return movements;
	}

	/** Returns picked cell */
	getPickedCell() {
		let self = this;
		let cell = null;
		if (this.scene.pickMode === false && this.scene.pickResults !== null) {
			this.scene.pickResults.forEach(function(result) {
				let pickId = result[1];
				cell = self.board.getCellByPickId(pickId);
			});
			this.scene.pickResults.splice(0, this.scene.pickResults.length);
		}
		return cell;
	}
}

class MoveShipStatePvP extends State {
	/**
	* Move ship state for PvP mode
	* @param {StateManager} stateManager - State manager
	* @param {CGFscene} scene - Scene
	* @param {Board} board - The game board
	* @param {String} faction - The current faction
	* @param {Object} from - Movement origin
	* @param {Object} to - Movement destination
	* @constructor
	*/
	constructor(stateManager, scene, board, faction, from, to) {
		super(stateManager, scene);
		console.log('Entered MoveShipStatePvP ...');
		this.board = board;
		this.faction = faction;
		this.from = from;
		this.to = to;

		this.beganAnimation = false;

		let self = this;
		let connection = new Connection();
		connection.moveShipRequest(board, faction, from.x, from.z, to.x, to.z, function(data) {
			board.board = parseStringArray(data.target.response.replace(/%20/g, " "));

			// TODO: GAME FILM TEST, PLEASE IGNORE
			self.stateManager.film.setPlayMove(from, to, board.board);

			board.getShipAt(from).animation = new HopAnimation(1, board.getScenePosition(from), board.getScenePosition(to));
			board.getShipAt(from).animation.play();
			self.beganAnimation = true;
		});
	}

	/** Renders state */
	draw() {
		this.board.display();
	}

	/**
	* Updates state
	* @param {Number} dt - Delta time
	*/
	update(dt) {
		this.board.update(dt);

		if (this.beganAnimation && this.board.getShipAt(this.from).animation.finished) {
			this.board.resetPickRegistration();
			this.board.resetSelection();
			this.stateManager.changeState(new StructBuildStatePvP(this.stateManager, this.scene, this.board, this.faction, this.to));
		}
	}
}

class StructBuildStatePvP extends State {
	/**
	* Struct build state for PvP mode
	* @param {StateManager} stateManager - State manager
	* @param {CGFscene} scene - Scene
	* @param {Board} board - The game board
	* @param {String} faction - The current faction
	* @param {Object} position - The structure position
	* @constructor
	*/
	constructor(stateManager, scene, board, faction, position) {
		super(stateManager, scene);
		console.log('Entered StructBuildStatePvP ...');
		this.board = board;
		this.faction = faction;
		this.position = position;

		this.beganColonyAnimation = false;
		this.beganTradeStationAnimation = false;

		this.beganUndoAnimation = false;

		this.board.initBoard();
		this.board.selectCell(position);

		stateManager.overlay.updateTip('Press c/C to place a Colony, or t/T to place a Trade Station');
	}

	/** Renders state */
	draw() {
		this.board.display();
	}

	/** 
	* Updates state
	* @param {Number} dt - Delta time
	*/
	update(dt) {
		this.board.update(dt);
		
		if (this.beganColonyAnimation && this.board.getAuxColony(this.faction).animation.finished) {
			let structAuxPos = this.board.popAuxColony(this.faction);

			// TODO: GAME FILM TEST, PLEASE IGNORE
			this.stateManager.film.setPlayStruct('colony', structAuxPos);
			
			this.board.placeColony(this.position, this.faction);
			this.stateManager.changeState(new TestEndStatePvP(this.stateManager, this.scene, this.board, this.faction));
		}

		if (this.beganTradeStationAnimation && this.board.getAuxTradeStation(this.faction).animation.finished) {
			let structAuxPos = this.board.popAuxTradeStation(this.faction);

			// TODO: GAME FILM TEST, PLEASE IGNORE
			this.stateManager.film.setPlayStruct('tradeStation', structAuxPos);
			
			this.board.placeTradeStation(this.position, this.faction);				
			this.stateManager.changeState(new TestEndStatePvP(this.stateManager, this.scene, this.board, this.faction));
		}

		if (this.beganUndoAnimation) {
			let play = this.stateManager.film.getPlay();
			let selected = this.board.getCellAt(play.from);
			if (this.board.getShipAt(play.to).animation.finished) {
				this.board.board = play.prevBoard;
				this.stateManager.changeState(new MovePickStatePvP(this.stateManager, this.scene, this.board, play.faction, selected));				
			}
		}
	}

	/**
	* Handles input
	* @param {Number} keycode - Key code
	*/
	handleInput(keycode) {
		if (!this.beganColonyAnimation && !this.beganTradeStationAnimation && !this.beganUndoAnimation) {
			if (keycode === 67 || keycode === 99) {
				this.stateManager.overlay.updateTip('');
				this.board.getAuxColony(this.faction).animation = new HopAnimation(1, this.board.getAuxColonyPosition(this.faction), this.board.getScenePosition(this.position));
				this.board.getAuxColony(this.faction).animation.play();
				this.beganColonyAnimation = true;
			}
			if (keycode === 84 || keycode === 116) {
				this.stateManager.overlay.updateTip('');
				this.board.getAuxTradeStation(this.faction).animation = new HopAnimation(1, this.board.getAuxTradeStationPosition(this.faction), this.board.getScenePosition(this.position));
				this.board.getAuxTradeStation(this.faction).animation.play();
				this.beganTradeStationAnimation = true;
			}
			if (keycode === 37) {
				this.undo();
			}
		}
	}

	/** Undoes play */
	undo() {
		if (!this.beganColonyAnimation && !this.beganTradeStationAnimation && !this.beganUndoAnimation) {
			this.stateManager.overlay.updateTip('');
			let play = this.stateManager.film.getPlay();
			this.board.getShipAt(play.to).animation = new HopAnimation(1, this.board.getScenePosition(play.to), this.board.getScenePosition(play.from));
			this.board.getShipAt(play.to).animation.play();
			this.beganUndoAnimation = true;
		}
	}
}

class TestEndStatePvP extends State {
	/**
	* Test end game state for PvP mode
	* @param {StateManager} stateManager - State manager
	* @param {CGFscene} scene - Scene
	* @param {Board} board - Board
	* @param {String} faction - The current faction
	* @constructor
	*/
	constructor(stateManager, scene, board, faction) {
		super(stateManager, scene);
		console.log('Entered TestEndStatePvP ...');
		this.board = board;

		let connection = new Connection();
		connection.isGameOverRequest(board, function(data) {
			if (data.target.response === '0') {
				stateManager.changeState(new LoadStatePvP(stateManager, scene, board, faction));
			} else {
				stateManager.changeState(new GameOverStatePvP(stateManager, scene, board));
			}
		});

		this.stateManager.overlay.updateScore(this.board);
	}

	/** Renders state */
	draw() {
		this.board.display();
	}
}

class GameOverStatePvP extends State {
	/**
	* Game over state for PvP mode
	* @param {StateManager} stateManager - State manager
	* @param {CGFscene} scene - Scene
	* @param {Board} board - The game board
	* @constructor
	*/
	constructor(stateManager, scene, board) {
		super(stateManager, scene);
		console.log('Entered GameOverStatePvP ...');
		this.board = board;

		board.initBoard();

		let factionOneScore = this.stateManager.overlay.getScore('factionOne');
		let factionTwoScore = this.stateManager.overlay.getScore('factionTwo');
		if (factionOneScore === factionTwoScore) {
			this.stateManager.overlay.updateWinner('It\'s a tie.');
		} else if (factionOneScore > factionTwoScore) {
			this.stateManager.overlay.updateWinner('Blue won!');
		} else {
			this.stateManager.overlay.updateWinner('Yellow won!');
		}

		this.stateManager.overlay.endTimer();
		this.stateManager.finished = true;
	}

	/** Renders state */
	draw() {
		this.board.display();
	}
}

class PvP extends State {
	/**
	* PvP game mode
	* @param {StateManager} stateManager - State manager
	* @param {CGFscene} scene - Scene
	* @param {Overlay} overlay - Overlay
	* @param {dat.GUI} gui - GUI
	* @param {Number} turnDuration - Duration of a turn
	* @constructor
	*/
	constructor(stateManager, scene, overlay, gui, turnDuration) {
		super(stateManager, scene);

		this.gameStateManager = new StateManager();
		
		this.board = new Board(scene);
		let to = this.board.getBoardCenter();
		let from = vec3.fromValues(to[0], to[1] + 20, to[2] - 15);

		this.gameStateManager.camera = new CGFcamera(Math.PI/2, 0.1, 100.0, from, to);
		this.gameStateManager.overlay = overlay;
		this.gameStateManager.film = new GameFilm();

		this.gameStateManager.overlay.showScore();
		this.gameStateManager.overlay.setStopWatchDuration(turnDuration);
		this.gameStateManager.overlay.showStopWatch();
		this.gameStateManager.overlay.beginTimer();

		let self = this;
		this.gameStateManager.beginCameraRotation = function(angle) {
			if (self.gameStateManager.camera._up[1] === 1) {
				self.angle = 0;
			}
		};

		if (!this.scene.graph.views.order.includes('defaultgamecam')) {
			this.scene.graph.views.order.push('defaultgamecam');
		}
		this.scene.graph.views.perspectives['defaultgamecam'] = this.gameStateManager.camera;

		this.scene.interface.setActiveCamera(this.gameStateManager.camera);
		this.scene.camera = this.gameStateManager.camera;
		this.currentFaction = 'factionOne';
		
		this.gameStateManager.pushState(new LoadStatePvP(this.gameStateManager, this.scene, this.board, this.currentFaction));
		this.gameStateManager.overlay.updateScore(this.board);

		this.angle = 1000;
		this.angularstep = 0.15;

		this.gui = gui;
		this.actions = this.gui.addFolder('Actions');
		this.actions.add(this, 'Menu');
		this.actions.add(this, 'Undo');
		this.filmAvailable = false;
		this.actions.open();
	}

	/** Renders state */
	draw() {
		this.scene.clearPickRegistration();
		this.gameStateManager.draw();
	}

	/**
	* Updates state
	* @param {Number} dt - Delta time
	*/
	update(dt) {
		this.gameStateManager.update(dt);
		this.gameStateManager.overlay.update(dt);
		this.currentFaction = this.gameStateManager.getCurrentState().faction;

		if (this.angle < Math.PI) {
			if (this.angle + this.angularstep <= Math.PI) {
				this.gameStateManager.camera.orbit(CGFcameraAxis.Y, this.angularstep);
				this.angle += this.angularstep;
			} else {
				let diff = Math.PI - this.angle;
				this.gameStateManager.camera.orbit(CGFcameraAxis.Y, diff);
				this.angle += this.angularstep;
			}
		}

		if (this.gameStateManager.overlay.hasStopWatchEnded(this.currentFaction) && !this.timeout) {
			this.gameStateManager.overlay.setScore(this.currentFaction, -1);
			this.gameStateManager.pushState(new GameOverStatePvP(this.gameStateManager, this.scene, this.board));
			this.timeout = true;
		}

		if (!this.filmAvailable && this.gameStateManager.finished && this.gameStateManager.film.current !== 0) {
			this.actions.add(this, 'Replay');
			this.filmAvailable = true;
		}
	}

	/**
	* Handles input
	* @param {Number} keycode - Key code
	*/
	handleInput(keycode) {
		this.gameStateManager.handleInput(keycode);

		if (keycode === 82 || keycode === 114) {
			this.resetCamera();
		}
	}

	/** Resets camera position */
	resetCamera() {
		let to = this.board.getBoardCenter();
		let from = null;
		if (this.currentFaction === 'factionOne') {
			from = vec3.fromValues(to[0], to[1] + 20, to[2] - 15);
		} else {
			from = vec3.fromValues(to[0], to[1] + 20, to[2] + 15);
		}
		let camera = new CGFcamera(Math.PI/2, 0.1, 100.0, from, to);
		this.gameStateManager.camera.position = camera.position;
		this.gameStateManager.camera.target = camera.target;
		this.gameStateManager.camera.direction = camera.direction;
		this.gameStateManager.camera._up = camera._up;
	}

	/**
	* Removes dat.GUI folder
	* @param {dat.GUI} gui - GUI
	* @param {String} name - Folder name
	*/
	removeFolder(gui, name) {
		let folder = gui.__folders[name];
		if (!folder) return;
		folder.close();
		gui.__ul.removeChild(folder.domElement.parentNode);
		delete gui.__folders[name];
		gui.onResize();
	}

	/** Handles transition to menu state */
	Menu() {
		this.removeFolder(this.gui, 'Actions');
		this.stateManager.changeState(new Menu(this.stateManager, this.scene, this.gameStateManager.overlay, this.gui));
	}

	/** Handles state undo */
	Undo() {
		if (this.gameStateManager.getCurrentState().undo) {
			this.gameStateManager.getCurrentState().undo();
		}
	}

	/** Handles transition to replay state */
	Replay() {
		this.removeFolder(this.gui, 'Actions');
		this.stateManager.pushState(new Replay(this.stateManager, this.scene, this.gameStateManager.film, this.gameStateManager.overlay, this.gui));
	}
}

