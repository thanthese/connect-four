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
        array[x] = initArray(height, value);
    }
    return array;
}

function incKey(obj, key) {
    if(!(key in obj)) {
        obj[key] = 0;
    }
    obj[key]++;
    return obj;
}

function isEven(n) {
    return n % 2 === 0;
}

///////////////////////////////////////////////////////////////////////////////
//// Connect Four logic

function Board() {
    // (0, 0) is bottom left
    this.board = init2DArray(WIDTH, HEIGHT, EMPTY);
    this.turn = RED;
    this.status = IN_PROGRESS;
    this.moveHistory = [];
}

Board.prototype.clone = function() {
    var b = new Board();
    b.board = clone2DArray(this.board);
    b.turn = this.turn;
    b.status = this.status;
    b.moveHistory = this.moveHistory.clone();
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
    this.moveHistory.push([move, y]);
    this.status = this._calcStatus([move, y], this.turn);
    this.turn = this.turn == RED ? BLACK : RED;
    return this;
};

Board.prototype.isLegalMove = function(move) {
    return this.board[move][HEIGHT - 1] == EMPTY;
};

Board.prototype._calcStatus = function(pos, turn) {
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

    if(this._isDrawn()) {
        return DRAW;
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
    return this.moveHistory.length >= WIDTH * HEIGHT;
};

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

ChaosMonkey.prototype.description = function() {
    return "Chaos Monkey";
};

ChaosMonkey.prototype.nextMove = randomLegalMove;

// Strategy: make left-most legal move
function Lefty(color) {
    this.color = color;
}

Lefty.prototype.description = function() {
    return "Lefty";
};

Lefty.prototype.nextMove = function(board) {
    for(var x = 0; x < WIDTH; ++x) {
        if(board.isLegalMove(x)) {
            return x;
        }
    }
};

// Strategy: Monte Carlo
// - tries: number of simulations to run per turn
// - depth: at what move depth into the future to apply bonuses
// - bonuses: how much more strongly to score wins and losses
function MonteCarlo(color, tries, depth, winBonus, lossBonus, parityBonus) {
    this.color = color;
    this.tries = tries;
    this.weightsHistory = [];
    this.depth = depth;
    this.winBonus = winBonus;
    this.lossBonus = lossBonus;
    this.parityBonus = parityBonus;
    this.illegalBonus = 1000;
}

MonteCarlo.prototype.description = function() {
    return "Depth Matters 2: #" + this.tries
        + " D" + this.depth
        + " W" + this.winBonus
        + " L" + this.lossBonus
        + " P" + this.parityBonus;
};

MonteCarlo.prototype.nextMove = function(board) {
    var moveScores = initArray(WIDTH, 0);
    for(var t = 0; t < this.tries; ++t) {
        var move = randomMove();
        var finalBoard = this.simulateFromMoveToEndOfGame(board, move);
        if(finalBoard == ERROR_ILLEGAL_MOVE) {
            moveScores[move] -= this.illegalBonus;
            continue;
        }
        var depth = finalBoard.moveHistory.length - board.moveHistory.length;
        if(IWon(this.color, finalBoard.status)) {
            moveScores[move] += depth <= this.depth ? this.winBonus : 1;
            var winningMoveRow = finalBoard.moveHistory[finalBoard.moveHistory.length - 1][1];
            if((this.color == BLACK && isEven(winningMoveRow))
                    || (this.color == RED && !isEven(winningMoveRow))) {
                moveScores[move] += this.parityBonus;
            }
        } else if(ILost(this.color, finalBoard.status)) {
            moveScores[move] -= depth <= this.depth ? this.lossBonus : 1;
        }
    }
    this.weightsHistory.push(moveScores);
    return moveScores.indexOf(Math.max.apply(null, moveScores));
};

MonteCarlo.prototype.simulateFromMoveToEndOfGame = function(board, moveToTest) {
    if(!board.isLegalMove(moveToTest)) {
        return ERROR_ILLEGAL_MOVE;
    }
    var b = board.clone();
    b.makeMove(moveToTest);
    while(b.status == IN_PROGRESS) {
        b.makeMove(randomLegalMove(b));
    }
    return b;
};

///////////////////////////////////////////////////////////////////////////////
//// running games

// playerA must be red and will go first
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
    }
}

// The bot factory should take a single argument: color. Both bots will have
// their chance to go first.
function playManyGames(botFactoryA, botFactoryB, numOfGames) {
    var gamesLog = [];
    for(var i = 0; i < numOfGames; ++i) {
        var red, black, winner, loser, playerAisRed, winnerId;
        if(Math.random() < 0.5) {
            red = botFactoryA(RED);
            black = botFactoryB(BLACK);
            playerAisRed = true;
        } else {
            red = botFactoryB(RED);
            black = botFactoryA(BLACK);
            playerAisRed = false;
        }
        var board = playSingleGame(red, black);
        if(board.status == RED_WON) {
            winner = red;
            loser = black;
            winnerId = playerAisRed ? 1 : 2;
        } else if(board.status == BLACK_WON) {
            winner = black;
            loser = red;
            winnerId = playerAisRed ? 2 : 1;
        } else {
            winner = DRAW;
            loser = DRAW;
            winnerId = 0;
        }
        gamesLog.push({winnerId: winnerId,
            winner: winner, loser: loser,
            board: board});
    }
    return gamesLog;
}

// Pit all bots against each other in all possible combinations. For each
// match, play numOfGames.
function battleRoyale(botFactories, numOfGames) {
    var matches = [];
    for(var i = 0; i < botFactories.length; ++i) {
        for(var j = i + 1; j < botFactories.length; ++j) {
            matches.push(playManyGames(botFactories[i], botFactories[j], numOfGames));
        }
    }
    return matches;
}

///////////////////////////////////////////////////////////////////////////////
//// human wants to play, too

function HumanGame(botFactory, humanGoesFirst) {
    this.board = new Board();
    this.opponent = botFactory(humanGoesFirst ? BLACK : RED);
    this.color = humanGoesFirst ? RED : BLACK;
    if(!humanGoesFirst) {
        this._makeBotMove();
    }
    this._showBoard();
}

HumanGame.prototype.move = function(move) {
    this.board.makeMove(move);
    this._showBoard();
    if(this.board.status == IN_PROGRESS) {
        this._makeBotMove();
        this._showBoard();
    }
};

HumanGame.prototype._makeBotMove = function() {
    var move = this.opponent.nextMove(this.board);
    this.board.makeMove(move);
    console.log("Bot moved at: " + move);
};

HumanGame.prototype._showBoard = function() {
    console.log("You are: " + this.color);
    console.log(this.board.toString());
};

///////////////////////////////////////////////////////////////////////////////
//// analysis tools

// generate high-level totals of who won how many games
function summarizeGames(games) {
    var totals = {};
    for(var i = 0; i < games.length; ++i) {
        if(games[i].winner === DRAW) {
            incKey(totals, "draw");
        } else {
            incKey(totals, games[i].winner.description());
            var loserDesc = games[i].loser.description();
            if(!(loserDesc in totals)) {
                totals[loserDesc] = 0;
            }
        }
    }
    return totals;
}

function summarizeMatches(matches) {
    return matches.map(summarizeGames);
}

// find an example of a bot losing to another bot
function findLoss(botFactoryA, botFactoryB, desiredLoserId) {
    var game;
    var attempts = 0;
    do {
        game = playManyGames(botFactoryA, botFactoryB, 1)[0];
        attempts++;
    } while(game.winnerId == desiredLoserId);
    console.log("Lost game found in " + attempts + " attempts.");
    return game;
}

// print the blow-by-blow, with weight statistics, of a
// monte carlo algorithm loss
function replayMonteCarloLoss(game) {
    _replayMonteCarlo(game, "loser");
}

function replayMonteCarloWin(game) {
    _replayMonteCarlo(game, "winner");
}

function _replayMonteCarlo(game, winnerOrLoser) {
    var board = new Board();
    var weightsTurn = 0;
    console.log(game);
    console.log(board.toString());
    for(var i = 0; i < game.board.moveHistory.length; ++i) {
        board.makeMove(game.board.moveHistory[i][0]);
        console.log(board.toString());
        if(board.turn == game[winnerOrLoser].color && board.status == IN_PROGRESS) {
            console.log(game[winnerOrLoser].weightsHistory[weightsTurn]);
            weightsTurn++;
        }
    }
}

///////////////////////////////////////////////////////////////////////////////
//// bot factories

// controls
var monkey = function(color) { return new ChaosMonkey(color); };
var lefty = function(color) { return new Lefty(color); };

// simple monte carlo
var smc100 = function(color) { return new MonteCarlo(color, 100, 0, 0, 0, 0); };
var smc300 = function(color) { return new MonteCarlo(color, 300, 0, 0, 0, 0); };
var smc50k = function(color) { return new MonteCarlo(color, 50000, 0, 0, 0, 0); };

// depth, with loss bonus
var depth100 = function(color) { return new MonteCarlo(color, 100, 2, 1, 100, 0); };
var depth300 = function(color) { return new MonteCarlo(color, 300, 2, 1, 100, 0); };
var depth50k = function(color) { return new MonteCarlo(color, 50000, 2, 1, 100, 0); };
var depth1m = function(color) { return new MonteCarlo(color, 1000000, 2, 1, 100, 0); };

// parity
var parity100 = function(color) { return new MonteCarlo(color, 100, 2, 1, 100, 2); };
var parity300 = function(color) { return new MonteCarlo(color, 300, 2, 1, 100, 2); };
var parity50k = function(color) { return new MonteCarlo(color, 50000, 2, 1, 100, 2); };
var parity1m = function(color) { return new MonteCarlo(color, 1000000, 2, 1, 100, 2); };

///////////////////////////////////////////////////////////////////////////////
//// main

function main() {
    console.log(summarizeMatches(battleRoyale([depth300, parity300], 100)));
}

console.time("main");
main();
console.timeEnd("main");