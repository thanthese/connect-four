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
var ERROR_NO_LEGAL_MOVES = 1;

var LOGGING = false;

///////////////////////////////////////////////////////////////////////////////
//// game-agnostic primatives

Array.prototype.clone = function() {
    return this.slice(0);
};

Array.prototype.last = function() {
    return this[this.length - 1];
};

Array.prototype.tail = function() {
    var array = [];
    for (var i = 1; i < this.length; ++i) {
        array.push(this[i]);
    }
    return array;
};

Array.prototype.randomElement = function() {
    return this[Math.floor(Math.random() * this.length)];
};

function clone2DArray(array) {
    var a = [];
    for (var i = 0; i < array.length; ++i) {
        a.push(array[i].clone());
    }
    return a;
}

function initArray(size, value) {
    var array = [];
    for (var i = 0; i < size; ++i) {
        array.push(value);
    }
    return array;
}

function init2DArray(width, height, value) {
    var array = [];
    for (var x = 0; x < width; ++x) {
        array[x] = initArray(height, value);
    }
    return array;
}

function range(num) {
    var r = [];
    for (var i = 0; i < num; ++i) {
        r.push(i);
    }
    return r;
}

function incKey(obj, key) {
    if (!(key in obj)) {
        obj[key] = 0;
    }
    obj[key] ++;
    return obj;
}

function isEven(n) {
    return n % 2 === 0;
}

function debug(str) {
    if (LOGGING) {
        clog(str);
    }
}

var clog = console.log;

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
    for (var y = HEIGHT - 1; y >= 0; --y) {
        var row = [];
        for (var x = 0; x < WIDTH; ++x) {
            row.push(this.board[x][y]);
        }
        rows.push(row.join("  "));
    }
    rows.push("===================");
    rows.push("Status: " + this._prettyStatus(this.status));
    return rows.join('\n');
};

Board.prototype._prettyStatus = function(status) {
    switch (status) {
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
    if (!this.isLegalMove(move)) {
        throw ERROR_ILLEGAL_MOVE;
    }
    var y = HEIGHT - 1;
    while (y > 0 && this.board[move][y - 1] == EMPTY) {
        y--;
    }
    this.board[move][y] = this.turn;
    this.moveHistory.push([move, y]);
    this.status = this._calcStatus([move, y], this.turn);
    this.turn = this.turn == RED ? BLACK : RED;
    return this;
};

Board.prototype.isLegalMove = function(move) {
    return this.board[move][HEIGHT - 1] == EMPTY && this.status == IN_PROGRESS;
};

Board.prototype._calcStatus = function(pos, turn) {
    var winCode = turn == RED ? RED_WON : BLACK_WON;
    if (this._dirCheck(pos, turn, [0, -1]) >= 3) {
        return winCode;
    }
    if (this._dirCheck(pos, turn, [1, 0]) + this._dirCheck(pos, turn, [-1, 0]) >= 3) {
        return winCode;
    }
    if (this._dirCheck(pos, turn, [1, 1]) + this._dirCheck(pos, turn, [-1, -1]) >= 3) {
        return winCode;
    }
    if (this._dirCheck(pos, turn, [-1, 1]) + this._dirCheck(pos, turn, [1, -1]) >= 3) {
        return winCode;
    }

    if (this._isDrawn()) {
        return DRAW;
    }

    return IN_PROGRESS;
};

// Starting from a position on the board, and given a direction, return
// how many pieces of a given color are in that direction in a row.
Board.prototype._dirCheck = function(pos, turn, vec) {
    for (var factor = 1; factor <= 3; ++factor) {
        var x = pos[0] + vec[0] * factor;
        var y = pos[1] + vec[1] * factor;
        if (x < 0 || x > WIDTH - 1 || y < 0 || y > HEIGHT - 1 || this.board[x][y] != turn) {
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
    return range(WIDTH)
        .filter(function(m) {
            return board.isLegalMove(m);
        })
        .randomElement();
}

function oppositeColor(color) {
    return color == RED ? BLACK : RED;
}

function IWon(myColor, boardStatus) {
    return (myColor == RED && boardStatus == RED_WON) || (myColor == BLACK && boardStatus == BLACK_WON);
}

function ILost(myColor, boardStatus) {
    return (myColor == RED && boardStatus == BLACK_WON) || (myColor == BLACK && boardStatus == RED_WON);
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
    for (var x = 0; x < WIDTH; ++x) {
        if (board.isLegalMove(x)) {
            return x;
        }
    }
};

// This is your basic monte carlo alg, but with a simple twist: during
// the random simulation if either side can win on the current turn,
// it will. Otherwise play is random.
function MonteCarloShort(color, triesPerMove) {
    this.color = color;
    this.triesPerMove = triesPerMove;
}

MonteCarloShort.prototype.description = function() {
    return "Monte Carlo, short circuit";
};

MonteCarloShort.prototype.nextMove = function(board) {
    var bestMove;
    var bestScore;

    // make winning move right away if it exists
    var wm = this.winningMove(board);
    if (wm != -1) {
        return wm;
    }

    for (var move = 0; move < WIDTH; ++move) {
        if (board.isLegalMove(move)) {

            // run simulations on starting move
            var score = 0;
            for (var t = 0; t < this.triesPerMove; ++t) {
                var finalBoard = this.simulateFromMoveToEndOfGame(board, move);
                if (IWon(this.color, finalBoard.status)) {
                    ++score;
                }
            }

            // score how move did in simulations
            if (!bestScore || bestScore < score) {
                bestScore = score;
                bestMove = move;
            }
        }
    }
    return bestMove;
};

MonteCarloShort.prototype.simulateFromMoveToEndOfGame = function(board, move) {
    var b = board.clone();
    b.makeMove(move);
    while (b.status == IN_PROGRESS) {
        var wm = this.winningMove(b);
        if (wm != -1) {
            b.makeMove(wm);
        } else {
            b.makeMove(randomLegalMove(b));
        }
    }
    return b;
};

// Return winning move if there is one, otherwise -1.
MonteCarloShort.prototype.winningMove = function(board) {
    for (var move = 0; move < WIDTH; ++move) {
        if (board.isLegalMove(move)) {
            var b = board.clone();
            b.makeMove(move);
            if (b.status != IN_PROGRESS) {
                return move;
            }
        }
    }
    return -1;
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
    return "Depth Matters 2: #" + this.tries + " D" + this.depth + " W" + this.winBonus + " L" + this.lossBonus + " P" + this.parityBonus;
};

MonteCarlo.prototype.nextMove = function(board) {
    var moveScores = initArray(WIDTH, 0);
    for (var t = 0; t < this.tries; ++t) {
        var move = randomMove();
        var finalBoard = this.simulateFromMoveToEndOfGame(board, move);
        if (finalBoard == ERROR_ILLEGAL_MOVE) {
            moveScores[move] -= this.illegalBonus;
            continue;
        }
        var depth = finalBoard.moveHistory.length - board.moveHistory.length;
        if (IWon(this.color, finalBoard.status)) {
            moveScores[move] += depth <= this.depth ? this.winBonus : 1;
            var winningMoveRow = finalBoard.moveHistory[finalBoard.moveHistory.length - 1][1];
            if ((this.color == BLACK && isEven(winningMoveRow)) || (this.color == RED && !isEven(winningMoveRow))) {
                moveScores[move] += this.parityBonus;
            }
        } else if (ILost(this.color, finalBoard.status)) {
            moveScores[move] -= depth <= this.depth ? this.lossBonus : 1;
        }
    }
    this.weightsHistory.push(moveScores);
    return moveScores.indexOf(Math.max.apply(null, moveScores));
};

MonteCarlo.prototype.simulateFromMoveToEndOfGame = function(board, moveToTest) {
    if (!board.isLegalMove(moveToTest)) {
        return ERROR_ILLEGAL_MOVE;
    }
    var b = board.clone();
    b.makeMove(moveToTest);
    while (b.status == IN_PROGRESS) {
        b.makeMove(randomLegalMove(b));
    }
    return b;
};

var MCTS = function() {

    // Attempt at the official MCTS algorithm.
    //
    // Resources
    // - original paper                               = http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.81.6817
    // - original UCT formula                         = http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.102.1296
    // - wikipedia page                               = http://en.wikipedia.org/wiki/Monte-Carlo_Tree_Search#cite_note-Kocsis-Szepesvari-13
    // - MoGo paper (first strong go-playing program) = http://hal.inria.fr/docs/00/11/72/66/PDF/MoGoReport.pdf
    // - arimaa master thesis (good overview)         = http://arimaa.com/arimaa/papers/TomasKozelekThesis/mt.pdf
    function MCTS(color, spec) {
        this.color = color;
        this.tries = spec.tries;
    }

    MCTS.prototype.description = function() {
        return "MCTS: " + this.tries;
    };

    MCTS.prototype.nextMove = function(board) {
        var root = new Node(null);
        root.expand(board);
        for (var i = 0; i < this.tries; ++i) {
            var node = descend(root);
            var b = catchUpBoard(board.clone(), node);
            if (b.status != IN_PROGRESS) {
                this.backPropogate(b.status, node);
                continue;
            }
            node.expand(b);
            var child = node.children
                .filter(function(n) {
                    return n.legalMove;
                })
                .randomElement();
            var resultStatus = runSimulation(b, child.move);
            this.backPropogate(resultStatus, child);
        }
        debug(root);
        debug("root children wins        : " + root.children.map(function(c) {
            return prettyNum(c.wins);
        }));
        debug("root children simulations : " + root.children.map(function(c) {
            return prettyNum(c.simulations);
        }));
        debug("root children scores      : " + root.children.map(function(c) {
            return prettyNum(c.getScore());
        }));
        return highestSimulations(root).move;
    };

    function highestSimulations(node) {
        var legals = node.children.filter(function(n) {
            return n.legalMove;
        });
        var simulations = legals.map(function(n) {
            return n.simulations;
        });
        var maxScore = Math.max.apply(null, simulations);
        var maxNodes = node.children.filter(function(n) {
            return n.simulations == maxScore;
        });
        var chosenNode = maxNodes.randomElement();
        return chosenNode;
    }

    function prettyNum(n) {
        n = n.toFixed(2);
        while (n.toString().length < 8) {
            n = " " + n;
        }
        return n;
    }

    MCTS.prototype.backPropogate = function(boardStatus, node) {
        if (IWon(this.color, boardStatus)) {
            backPropogateWin(node);
            return;
        }
        if (ILost(this.color, boardStatus) || boardStatus == DRAW) {
            backPropogateLoss(node);
            return;
        }
    };

    function descend(node) {
        var n = node;
        while (!n.isTerminal()) {
            n = bestChild(n);
        }
        return n;
    }

    function bestChild(node) {
        var bestNodes = [];
        var bestScore = -Infinity;
        for (var i = 0; i < node.children.length; ++i) {
            if (!node.children[i].legalMove) {
                continue;
            }
            var score = node.children[i].getScore();
            if (score > bestScore) {
                bestNodes = [node.children[i]];
                bestScore = score;
            } else {
                bestNodes.push(node.children[i]);
            }
        }
        if (bestNodes.length === 0) {
            clog("error: node has no legal moves");
            clog(node);
            throw ERROR_NO_LEGAL_MOVES;
        }
        return bestNodes.randomElement();
    }

    function catchUpBoard(board, node) {
        var moves = node.ancestors.map(function(a) {
            return a.move;
        });
        moves = moves.tail();
        moves.push(node.move);
        for (var i = 0; i < moves.length; ++i) {
            board.makeMove(moves[i]);
        }
        return board;
    }

    function backPropogateLoss(node) {
        backPropogateField(node, "simulations");
    }

    function backPropogateWin(node) {
        backPropogateField(node, "simulations");
        backPropogateField(node, "wins");
    }

    function backPropogateField(node, field) {
        node[field] ++;
        for (var i = 0; i < node.ancestors.length; ++i) {
            node.ancestors[i][field] ++;
        }
    }

    function runSimulation(board, move) {
        board.makeMove(move);
        while (board.status == IN_PROGRESS) {
            board.makeMove(randomLegalMove(board));
        }
        return board.status;
    }

    function Node(move) {
        this.move = move;
        this.simulations = 1;
        this.wins = 0;
        this.children = [];
        this.ancestors = [];
        this.legalMove = true;
        this.C = Math.sqrt(2);
    }

    Node.prototype.expand = function(board) {
        for (var i = 0; i < WIDTH; ++i) {
            var n = new Node(i);
            n.ancestors = this.ancestors.concat([this]);
            n.legalMove = board.isLegalMove(i) && board.status == IN_PROGRESS;
            this.children.push(n);
        }
    };

    Node.prototype.getScore = function() {
        if (this.simulations === 0) {
            return 0;
        }
        var firstTerm = this.wins / this.simulations;
        var inRoot = Math.log(this.ancestors.last().simulations) / this.simulations;
        var secondTerm = this.C * Math.sqrt(inRoot);
        return firstTerm + secondTerm;
    };

    Node.prototype.isTerminal = function() {
        return this.children.length === 0;
    };

    return MCTS;
}();

///////////////////////////////////////////////////////////////////////////////
//// running games

// playerA must be red and will go first
function playSingleGame(botA, botB) {
    var board = new Board();
    while (true) {
        board.makeMove(botA.nextMove(board));
        if (board.status != IN_PROGRESS) {
            return board;
        }
        board.makeMove(botB.nextMove(board));
        if (board.status != IN_PROGRESS) {
            return board;
        }
    }
}

// The bot factory should take a single argument: color. Both bots will have
// their chance to go first.
function playManyGames(botFactoryA, botFactoryB, numOfGames) {
    var gamesLog = [];
    for (var i = 0; i < numOfGames; ++i) {
        clog("playing game: " + i);
        var red, black, winner, loser, playerAisRed, winnerId;
        if (Math.random() < 0.5) {
            red = botFactoryA(RED);
            black = botFactoryB(BLACK);
            playerAisRed = true;
        } else {
            red = botFactoryB(RED);
            black = botFactoryA(BLACK);
            playerAisRed = false;
        }
        var board = playSingleGame(red, black);
        if (board.status == RED_WON) {
            winner = red;
            loser = black;
            winnerId = playerAisRed ? 1 : 2;
        } else if (board.status == BLACK_WON) {
            winner = black;
            loser = red;
            winnerId = playerAisRed ? 2 : 1;
        } else {
            winner = DRAW;
            loser = DRAW;
            winnerId = 0;
        }
        gamesLog.push({
            winnerId: winnerId,
            winner: winner,
            loser: loser,
            board: board
        });
    }
    return gamesLog;
}

// Pit all bots against each other in all possible combinations. For each
// match, play numOfGames.
function battleRoyale(botFactories, numOfGames) {
    var matches = [];
    for (var i = 0; i < botFactories.length; ++i) {
        for (var j = i + 1; j < botFactories.length; ++j) {
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
    if (!humanGoesFirst) {
        this._makeBotMove();
    }
    this._showBoard();
}

HumanGame.prototype.move = function(move) {
    this.board.makeMove(move);
    this._showBoard();
    if (this.board.status == IN_PROGRESS) {
        this._makeBotMove();
        this._showBoard();
    }
    return this.board.status;
};

HumanGame.prototype._makeBotMove = function() {
    var move = this.opponent.nextMove(this.board);
    this.board.makeMove(move);
    clog("Bot moved at: " + move);
};

HumanGame.prototype._showBoard = function() {
    clog("You are: " + this.color);
    clog(this.board.toString());
};

///////////////////////////////////////////////////////////////////////////////
//// analysis tools

// generate high-level totals of who won how many games
function summarizeGames(games) {
    var totals = {
        red: 0,
        black: 0
    };
    for (var i = 0; i < games.length; ++i) {
        if (games[i].winner === DRAW) {
            incKey(totals, "draw");
        } else {
            if (games[i].winner.color == RED) {
                totals.red++;
            }
            if (games[i].winner.color == BLACK) {
                totals.black++;
            }
            incKey(totals, games[i].winner.description());
            var loserDesc = games[i].loser.description();
            if (!(loserDesc in totals)) {
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
    } while (game.winnerId == desiredLoserId);
    clog("Lost game found in " + attempts + " attempts.");
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
    clog(game);
    clog(board.toString());
    for (var i = 0; i < game.board.moveHistory.length; ++i) {
        board.makeMove(game.board.moveHistory[i][0]);
        clog(board.toString());
        if (board.turn == game[winnerOrLoser].color && board.status == IN_PROGRESS) {
            clog(game[winnerOrLoser].weightsHistory[weightsTurn]);
            weightsTurn++;
        }
    }
}

///////////////////////////////////////////////////////////////////////////////
//// bot factories

// controls
var monkey = function(color) {
    return new ChaosMonkey(color);
};
var lefty = function(color) {
    return new Lefty(color);
};

// simple monte carlo
var smc100 = function(color) {
    return new MonteCarlo(color, 100, 0, 0, 0, 0);
};
var smc300 = function(color) {
    return new MonteCarlo(color, 300, 0, 0, 0, 0);
};
var smc50k = function(color) {
    return new MonteCarlo(color, 50000, 0, 0, 0, 0);
};

// depth, with loss bonus (smarter than simple)
var depth100 = function(color) {
    return new MonteCarlo(color, 100, 2, 1, 100, 0);
};
var depth300 = function(color) {
    return new MonteCarlo(color, 300, 2, 1, 100, 0);
};
var depth50k = function(color) {
    return new MonteCarlo(color, 50000, 2, 1, 100, 0);
};
var depth1m = function(color) {
    return new MonteCarlo(color, 1000000, 2, 1, 100, 0);
};

// parity (not a front runner)
var parity100 = function(color) {
    return new MonteCarlo(color, 100, 2, 1, 100, 2);
};
var parity300 = function(color) {
    return new MonteCarlo(color, 300, 2, 1, 100, 2);
};
var parity50k = function(color) {
    return new MonteCarlo(color, 50000, 2, 1, 100, 2);
};
var parity1m = function(color) {
    return new MonteCarlo(color, 1000000, 2, 1, 100, 2);
};

// short circuit monte carlo
var mcss100 = function(color) {
    return new MonteCarloShort(color, 100);
};
var mcss500 = function(color) {
    return new MonteCarloShort(color, 500);
};
var mcss50k = function(color) {
    return new MonteCarloShort(color, 50000);
};
var mcss1m = function(color) {
    return new MonteCarloShort(color, 1000000);
};

// MCTS (buggy? makes things worse)
var mcts100 = function(color) {
    return new MCTS(color, {
        tries: 100
    });
};
var mcts300 = function(color) {
    return new MCTS(color, {
        tries: 300
    });
};

///////////////////////////////////////////////////////////////////////////////
//// main

function mainBotFight() {
    clog("Starting battle royale...");
    console.time("main");
    // clog(summarizeMatches(battleRoyale([monkey, smc100, mcts100, mcts300], 100)));
    clog(summarizeMatches(battleRoyale([depth100, mcss100], 100)));
    console.timeEnd("main");
}

function mainHumanGame(opponent) {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    var generatedCallback = function() {
        var h = new HumanGame(opponent, Math.random() < 0.5);
        return function(colStr) {
            if (!/^[0-6]\n$/.test(colStr)) {
                clog("Please enter a number 0-6 and press ENTER.");
                return;
            }
            var status = h.move(parseInt(colStr, 10));
            if (status !== IN_PROGRESS) {
                clog("Game complete");
                process.exit(0);
            }
        };
    }();
    process.stdin.on("data", generatedCallback);
}

mainHumanGame(depth1m);
// mainBotFight();