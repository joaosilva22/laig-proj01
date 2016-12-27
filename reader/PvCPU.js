class LoadStatePvCPU extends State {
	constructor(stateManager, scene, board, faction, difficulty) {
		super(stateManager, scene);
		console.log('Entered LoadStatePvCPU ...');
		this.board = board;
		this.difficulty = difficulty;

		if (faction === 'factionOne') {
			this.faction = 'factionTwo';
		} else {
			this.faction = 'factionOne';
		}

		let self = this;
		if (board.board.length === 0) {
			board.load(function() {
				if (faction === 'factionOne') {
					self.stateManager.changeState(new ShipPickStatePvCPU(self.stateManager, self.scene, self.board, faction, self.difficulty));
				} else {
					self.stateManager.changeState(new BotPickStatePvCPU(self.stateManager, self.scene, self.board, faction, self.difficulty));
				}
			});
		} else {
			board.initBoard();
			this.loaded = true;
		}
	}

	update(dt) {
		if (this.loaded) {
			if (this.faction === 'factionOne') {
				this.stateManager.changeState(new ShipPickStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty));
			} else {
				this.stateManager.changeState(new BotPickStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty));
			}
		}
	}

	draw() {
		if (this.board.board.length !== 0) {
			this.board.display();
		}
	}
}

class BotPickStatePvCPU extends State {
	constructor(stateManager, scene, board, faction, difficulty) {
		super(stateManager, scene);
		console.log('Entered BotPickStatePvCPU ...');
		this.board = board;

		let self = this;
		let connection = new Connection();
		if (difficulty === 'easy') {
			// FIXME: Este request nao funciona
			connection.getRandomBoardRequest(faction, board, function(data) {
				let newboard = parseStringArray(data.target.response);
				let play = self.getMovement(newboard);
				stateManager.changeState(new BotMoveShipStatePvCPU(stateManager, scene, board, faction, difficulty, play.from, play.to, play.structure));
			});
		} else {
			connection.playerBestBoardRequest(faction, board, function(data) {
				let newboard = parseStringArray(data.target.response);
				let play = self.getMovement(newboard);
				stateManager.changeState(new BotMoveShipStatePvCPU(stateManager, scene, board, faction, difficulty, play.from, play.to, play.structure));
			});
		}
	}

	draw() {
		this.board.display();
	}

	getMovement(newboard) {
		let from = null;
		let to = null;
		let structure = null;
		for (let i = 0; i < newboard.length; i++) {
			for (let j = 0; j < newboard[i].length; j++) {
				if (newboard[i][j][0] === 'A' && this.board.board[i][j][0] !== 'A') {
					to = {x: j, z: i};
				}
				if (newboard[i][j][0] === 'B' && this.board.board[i][j][0] !== 'B') {
					to = {x: j, z: i};
				}
				if (newboard[i][j][0] !== 'A' && this.board.board[i][j][0] === 'A') {
					from = {x: j, z: i};
				}
				if (newboard[i][j][0] !== 'B' && this.board.board[i][j][0] === 'B') {
					from = {x: j, z: i};
				}
			}
		}
		switch (newboard[to.z][to.x][2]) {
			case 'o':
			case 'p':
				structure = 'colony';
				break;
			case 'l':
			case 'k':
				structure = 'tradestation';
				break;
		}
		return {from, to, structure};
	}
}

class ShipPickStatePvCPU extends State {
	constructor(stateManager, scene, board, faction, difficulty) {
		super(stateManager, scene);
		console.log('Entered PlayerPickStatePvCPU ...');
		this.board = board;
		this.faction = faction;
		this.difficulty = difficulty;

		this.board.registerShipsForPicking(faction);
	}

	draw() {
		this.board.display();
	}

	update(dt) {
		this.board.update(dt);
	}

	handleInput() {
		let selectedCell = this.getPickedCell();
		if (selectedCell !== null && selectedCell.pickable) {
			this.board.resetPickRegistration();
			this.board.selectCell(selectedCell.position);
			this.stateManager.changeState(new MovePickStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty, selectedCell));
		}
	}

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

class MovePickStatePvCPU extends State {
	constructor(stateManager, scene, board, faction, difficulty, selected) {
		super(stateManager, scene);
		console.log('Entered MovePickStatePvCPU ...');
		this.board = board;
		this.faction = faction;
		this.difficulty = difficulty;
		this.selected = selected;

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

	draw() {
		this.board.display();
	}

	handleInput() {
		let selectedCell = this.getPickedCell();
		if (selectedCell !== null && selectedCell.pickable) {
			this.board.resetPickRegistration();
			this.board.resetSelection();
			this.stateManager.changeState(new MoveShipStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty, this.selected.position, selectedCell.position));
		} else if (selectedCell !== null && !selectedCell.pickable) {
			this.board.resetPickRegistration();
			this.board.resetSelection();
			this.stateManager.changeState(new ShipPickStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty));
		}
	}

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

class BotMoveShipStatePvCPU extends State {
	constructor(stateManager, scene, board, faction, difficulty, from, to, structure) {
		super(stateManager, scene);
		console.log('Entered BotMoveShipStatePvCPU ...');
		this.board = board;
		this.faction = faction;
		this.difficulty = difficulty;
		this.from = from;
		this.to = to;
		this.structure = structure;

		this.beganAnimation = false;

		let self = this;
		let connection = new Connection();
		connection.moveShipRequest(board, faction, from.x, from.z, to.x, to.z, function(data) {
			board.board = parseStringArray(data.target.response);

			board.getShipAt(from).animation = new HopAnimation(1, board.getScenePosition(from), board.getScenePosition(to));
			board.getShipAt(from).animation.play();
			self.beganAnimation = true;
		});
	}

	draw() {
		this.board.display();
	}

	update(dt) {
		this.board.update(dt);

		if (this.beganAnimation && this.board.getShipAt(this.from).animation.finished) {
			this.board.resetPickRegistration();
			this.board.resetSelection();
			this.stateManager.changeState(new BotStructBuildStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty, this.to, this.structure));
		}
	}
}

class MoveShipStatePvCPU extends State {
	constructor(stateManager, scene, board, faction, difficulty, from, to) {
		super(stateManager, scene);
		console.log('Entered MoveShipStatePvCPU ...');
		this.board = board;
		this.faction = faction;
		this.difficulty = difficulty;
		this.from = from;
		this.to = to;

		this.beganAnimation = false;

		let self = this;
		let connection = new Connection();
		connection.moveShipRequest(board, faction, from.x, from.z, to.x, to.z, function(data) {
			board.board = parseStringArray(data.target.response);

			board.getShipAt(from).animation = new HopAnimation(1, board.getScenePosition(from), board.getScenePosition(to));
			board.getShipAt(from).animation.play();
			self.beganAnimation = true;
		});
	}

	draw() {
		this.board.display();
	}

	update(dt) {
		this.board.update(dt);

		if (this.beganAnimation && this.board.getShipAt(this.from).animation.finished) {
			this.board.resetPickRegistration();
			this.board.resetSelection();
			this.stateManager.changeState(new StructBuildStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty, this.to));
		}
	}
}

class BotStructBuildStatePvCPU extends State {
	constructor(stateManager, scene, board, faction, difficulty, position, structure) {
		super(stateManager, scene);
		console.log('Entered BotStructBuildStatePvCPU ...');
		this.board = board;
		this.faction = faction;
		this.difficulty = difficulty;
		this.position = position;
		this.structure = structure;

		if (structure === 'colony') {
			this.board.getAuxColony(this.faction).animation = new HopAnimation(1, this.board.getAuxColonyPosition(this.faction), this.board.getScenePosition(this.position));
			this.board.getAuxColony(this.faction).animation.play();
			this.beganColonyAnimation = true;
		} else {
			this.board.getAuxTradeStation(this.faction).animation = new HopAnimation(1, this.board.getAuxTradeStationPosition(this.faction), this.board.getScenePosition(this.position));
			this.board.getAuxTradeStation(this.faction).animation.play();
			this.beganTradeStationAnimation = true;
		}
		
		this.board.initBoard();
	}

	update(dt) {
		this.board.update(dt);

		if (this.beganColonyAnimation && this.board.getAuxColony(this.faction).animation.finished) {
			this.board.popAuxColony(this.faction);
			this.board.placeColony(this.position, this.faction);
			this.stateManager.changeState(new TestEndStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty));
		}

		if (this.beganTradeStationAnimation && this.board.getAuxTradeStation(this.faction).animation.finished) {
			this.board.popAuxTradeStation(this.faction);
			this.board.placeTradeStation(this.position, this.faction);
			this.stateManager.changeState(new TestEndStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty));
		}
	}

	draw() {
		this.board.display();
	}
}

class StructBuildStatePvCPU extends State {
	constructor(stateManager, scene, board, faction, difficulty, position) {
		super(stateManager, scene);
		console.log('Entered StructBuildStatePvCPU ...');
		this.board = board;
		this.faction = faction;
		this.difficulty = difficulty;
		this.position = position;

		this.beganColonyAnimation = false;
		this.beganTradeStationAnimation = false;

		this.board.initBoard();
		this.board.selectCell(position);
	}

	draw() {
		this.board.display();
	}

	update(dt) {
		this.board.update(dt);
		
		if (this.beganColonyAnimation && this.board.getAuxColony(this.faction).animation.finished) {
			this.board.popAuxColony(this.faction);
			this.board.placeColony(this.position, this.faction);
			this.stateManager.changeState(new TestEndStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty));
		}

		if (this.beganTradeStationAnimation && this.board.getAuxTradeStation(this.faction).animation.finished) {
			this.board.popAuxTradeStation(this.faction);
			this.board.placeTradeStation(this.position, this.faction);
			this.stateManager.changeState(new TestEndStatePvCPU(this.stateManager, this.scene, this.board, this.faction, this.difficulty));
		}
	}

	handleInput(keycode) {
		if (keycode === 67 || keycode === 99) {
			this.board.getAuxColony(this.faction).animation = new HopAnimation(1, this.board.getAuxColonyPosition(this.faction), this.board.getScenePosition(this.position));
			this.board.getAuxColony(this.faction).animation.play();
			this.beganColonyAnimation = true;
		}
		if (keycode === 84 || keycode === 116) {
			this.board.getAuxTradeStation(this.faction).animation = new HopAnimation(1, this.board.getAuxTradeStationPosition(this.faction), this.board.getScenePosition(this.position));
			this.board.getAuxTradeStation(this.faction).animation.play();
			this.beganTradeStationAnimation = true;
		}
	}
}

class TestEndStatePvCPU extends State {
	constructor(stateManager, scene, board, faction, difficulty) {
		super(stateManager, scene);
		this.board = board;

		let connection = new Connection();
		connection.isGameOverRequest(board, function(data) {
			if (data.target.response === '0') {
				stateManager.changeState(new LoadStatePvCPU(stateManager, scene, board, faction, difficulty));
			} else {
				stateManager.changeState(new GameOverStatePvCPU(stateManager, scene, board));
			}
		});
	}

	draw() {
		this.board.display();
	}
}

class GameOverStatePvCPU extends State {
	constructor(stateManager, scene, board) {
		super(stateManager, scene);
		this.board = board;

		board.initBoard();
	}

	draw() {
		this.board.display();
	}
}

class PvCPU extends State {
	constructor(stateManager, scene) {
		super(stateManager, scene);

		this.gameStateManager = new StateManager();

		this.board = new Board(scene);
		let to = this.board.getBoardCenter();
		let from = vec3.fromValues(to[0], to[1] + 20, to[2] - 15);

		this.camera = new CGFcamera(Math.PI / 2, 0.1, 100.0, from, to);
		this.scene.graph.views.order.push('defaultgamecam');
		this.scene.graph.views.perspectives['defaultgamecam'] = this.camera;

		this.scene.interface.setActiveCamera(null);
		this.scene.camera = this.camera;
		
		// FIXME: A dificuldade deve ser passada como parametro
		this.gameStateManager.pushState(new LoadStatePvCPU(this.gameStateManager, this.scene, new Board(scene), 'factionOne', 'hard'));
	}

	draw() {
		this.scene.clearPickRegistration();
		this.gameStateManager.draw();
	}

	update(dt) {
		this.gameStateManager.update(dt);
	}

	handleInput(keycode) {
		this.gameStateManager.handleInput(keycode);

		if (keycode === 82 || keycode === 114) {
			this.resetCamera();
		}
	}

	resetCamera() {
		let to = this.board.getBoardCenter();
		let from = vec3.fromValues(to[0], to[1] + 20, to[2] - 15);
		let camera = new CGFcamera(Math.PI/2, 0.1, 100.0, from, to);
		this.camera.position = camera.position;
		this.camera.target = camera.target;
		this.camera.direction = camera.direction;
		this.camera._up = camera._up;
	}
}
