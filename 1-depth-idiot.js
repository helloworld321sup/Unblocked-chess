/**
 * A simple depth 1 chess bot translated to JavaScript,
 * using the globally available Chess object from chess.js library.
 */

// We assume a 'game' object is initialized in home.js or similar script.
// For the bot to work, you will need an active instance of the game.
// If you don't have one, you can create one like this:
// let game = new Chess(); 

// The function to find the best move for the current turn (depth 1 search)
function findBestMove(game) {
    // Exit if the game is over
    if (game.game_over() || game.in_draw()) return null;

    const possibleMoves = game.moves();
    let bestMove = null;
    let bestScore = game.turn() === 'w' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

    // Iterate through all possible moves (depth 1)
    for (const move of possibleMoves) {
        // Apply the move temporarily
        game.move(move);

        // Evaluate the board position after the move
        const score = evaluateBoard(game);

        // Undo the move to return to the original state for the next iteration
        game.undo();

        // Check if this is the best move found so far
        if (game.turn() === 'w') {
            // White is maximizing player
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        } else {
            // Black is minimizing player
            if (score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
    }

    return bestMove;
}

// Simple evaluation function based on material count (from your Java code)
function evaluateBoard(game) {
    let score = 0;
    // The game.board() method returns an 8x8 array with piece objects or null
    const board = game.board();

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece) {
                const value = getPieceValue(piece.type);
                if (piece.color === 'w') {
                    score += value;
                } else {
                    score -= value;
                }
            }
        }
    }
    return score;
}

// Helper function to map piece type to value
function getPieceValue(type) {
    switch (type) {
        case 'p': return 10;
        case 'n': return 30;
        case 'b': return 30;
        case 'r': return 50;
        case 'q': return 90;
        case 'k': return 900;
        default: return 0;
    }
}

// --- Integration Example (requires a 'game' instance) ---
// This part demonstrates how you might call the bot function when a button is clicked.
document.addEventListener('DOMContentLoaded', () => {
    const botPlayBtn = document.getElementById('bot-play-btn');

    if (botPlayBtn) {
        botPlayBtn.addEventListener('click', () => {
            alert("Bot logic is ready. You need to manage game state (e.g., in home.js) to use it.");
            // Example of how to call it IF 'game' is available globally or passed:
            // const bestMoveUCI = findBestMove(game); 
            // console.log("Bot chose move:", bestMoveUCI);
            // game.move(bestMoveUCI); // Apply the move
        });
    }
});
