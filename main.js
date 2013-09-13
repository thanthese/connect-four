///////////////////////////////////////////////////////////////////////////////
//// poor-man's enums

var RED = 'r'; // always goes first
var BLACK = 'b';
var EMPTY = '.';

var WIDTH = 7;
var HEIGHT = 6;

var IN_PROGRESS = 0;
var RED_WON = 1;
var BLACK_WON = 2;
var DRAW = 3;

var ERROR_ILLEGAL_MOVE = 0;
var ERROR_NO_LEGAL_MOVES_FOUND = 1;

///////////////////////////////////////////////////////////////////////////////
//// game-agnostic primatives

Array.prototype.clone = function() {
	return this.slice(0);
};

function clone2DArray(array) {
    var a = [];
    for(var i = 0; i < array.length; ++i) {
        a.push(array[i].clone());
    }
    return a;
}

function initArray(size, value) {
    var array = [];
    for(var i = 0; i < size; ++i) {
        array.push(value);
    }
    return array;
}

function init2DArray(width, height, value) {
    var array = [];
    for(var x = 0; x < width; ++x) {
        array[x] = initArray(height, EMPTY);
    }
    return array;
}

///////////////////////////////////////////////////////////////////////////////
//// playing algorithms

function randomMove() {
    return Math.floor(WIDTH * Math.random());
}

function randomLegalMove(board) {
    var move = randomMove();
    var tries = 100;
    while(!board.isLegalMove(move)) {
        move = randomMove();
        tries--;
        if(tries < 0) {
            throw ERROR_NO_LEGAL_MOVES_FOUND;
        }
    }
    return move;
}

function oppositeColor(color) {
    return color == RED ? BLACK : RED;
}

function IWon(myColor, boardStatus) {
    return (myColor == RED && boardStatus == RED_WON)
        || (myColor == BLACK && boardStatus == BLACK_WON);
}

function ILost(myColor, boardStatus) {
    return (myColor == RED && boardStatus == BLACK_WON)
        || (myColor == BLACK && boardStatus == RED_WON);
}

// Strategy: make any random legal move
function ChaosMonkey(color) {
    this.color = color;
}

ChaosMonkey.prototype.nextMove = randomLegalMove;

// Stategy: most simple Monte Carlo.
// Can configure number of simulations to run.
function SimpleMonteCarlo(color, tries) {
    this.color = color;
    this.tries = tries;
}

SimpleMonteCarlo.prototype.nextMove = function(board) {
    var moveScores = initArray(WIDTH, 0);
    for(var t = 0; t < this.tries; ++t) {
        var move = randomMove();
        var finalStatus = this.simulateFromMoveToEndOfGame(board, move);
        if(finalStatus == DRAW) {
            moveScores[move] += 0;
        } else if(IWon(this.color, finalStatus)) {
            moveScores[move]++;
        } else if(ILost(this.color, finalStatus)) {
           moveScores[move]--;
        } else if(finalStatus == ERROR_ILLEGAL_MOVE) {
            moveScores[move] -= 1000;
        }
    }
    // console.log(moveScores);
    return moveScores.indexOf(Math.max.apply(null, moveScores));
}
;
SimpleMonteCarlo.prototype.simulateFromMoveToEndOfGame = function(board, moveToTest) {
    if(!board.isLegalMove(moveToTest)) {
        return ERROR_ILLEGAL_MOVE;
    }
    var b = board.clone();
    b.makeMove(moveToTest);
    while(b.status == IN_PROGRESS) {
        b.makeMove(randomLegalMove(b));
    }
    return b.status;
};

///////////////////////////////////////////////////////////////////////////////
//// Connect Four logic

function Board() {
    // (0, 0) is bottom left
    this.board = init2DArray(WIDTH, HEIGHT, EMPTY);
    this.turn = RED;
    this.status = IN_PROGRESS;
}

Board.prototype.clone = function() {
  var b = new Board();
  b.board = clone2DArray(this.board);
  b.turn = this.turn;
  b.status = this.status;
  return b;
};

Board.prototype.toString = function() {
    var rows = [];
    rows.push("0  1  2  3  4  5  6");
    rows.push("-------------------");
    for(var y = HEIGHT - 1; y >= 0; --y) {
        var row = [];
        for(var x = 0; x < WIDTH; ++x) {
            row.push(this.board[x][y]);
        }
        rows.push(row.join("  "));
    }
    rows.push("===================");
    rows.push("Status: " + this._prettyStatus(this.status));
    return rows.join('\n');
};

Board.prototype._prettyStatus = function(status) {
    switch(status) {
        case RED_WON:
            return "red wins!";
        case BLACK_WON:
            return "black wins!";
        case DRAW:
            return "draw";
        case IN_PROGRESS:
            return "in progress...";
    }
};

// destructive operation
Board.prototype.makeMove = function(move) {
    if(!this.isLegalMove(move)) {
        throw ERROR_ILLEGAL_MOVE;
    }
    var y = HEIGHT - 1;
    while(y > 0 && this.board[move][y - 1] == EMPTY) {
        y--;
    }
    this.board[move][y] = this.turn;
    this.status = this._calcStatus([move, y], this.turn);
    this.turn = this.turn == RED ? BLACK : RED;
    return this;
};

Board.prototype.isLegalMove = function(move) {
  return this.board[move][HEIGHT - 1] == EMPTY;
};

Board.prototype._calcStatus = function(pos, turn) {
    if(this._isDrawn()) {
        return DRAW;
    }
    var winCode = turn == RED ? RED_WON : BLACK_WON;

    if(this._dirCheck(pos, turn, [0, -1]) >= 3) {
        return winCode;
    }
    if(this._dirCheck(pos, turn, [1, 0]) + this._dirCheck(pos, turn, [-1, 0]) >= 3) {
        return winCode;
    }
    if(this._dirCheck(pos, turn, [1, 1]) + this._dirCheck(pos, turn, [-1, -1]) >= 3) {
        return winCode;
    }
    if(this._dirCheck(pos, turn, [-1, 1]) + this._dirCheck(pos, turn, [1, -1]) >= 3) {
        return winCode;
    }

    return IN_PROGRESS;
};

// Starting from a position on the board, and given a direction, return
// how many pieces of a given color are in that direction in a row.
Board.prototype._dirCheck = function(pos, turn, vec) {
    for(var factor = 1; factor <= 3; ++factor) {
        var x = pos[0] + vec[0] * factor;
        var y = pos[1] + vec[1] * factor;
        if(x < 0 || x > WIDTH - 1 || y < 0 || y > HEIGHT - 1
                || this.board[x][y] != turn) {
            return factor - 1;
        }
    }
    return 3;
};

Board.prototype._isDrawn = function() {
    for(var x = 0; x < WIDTH; ++x) {
        if(this.board[x][HEIGHT - 1] == EMPTY) {
            return false;
        }
    }
    return true;
};

///////////////////////////////////////////////////////////////////////////////
//// main

// playerA is red and goes first
function playSingleGame(botA, botB) {
    var board = new Board();
    while(true) {
        board.makeMove(botA.nextMove(board));
        if(board.status != IN_PROGRESS) {
            return board;
        }
        board.makeMove(botB.nextMove(board));
        if(board.status != IN_PROGRESS) {
            return board;
        }
        // console.log(board.toString());
    }
}

var result = [];
for(var i = 0; i < 100; ++i) {
    var finalBoard = playSingleGame(new ChaosMonkey(RED), new SimpleMonteCarlo(BLACK, 100));
    result.push(finalBoard.status);
}
console.log(result.join(''));