// Chess Analysis with Move Evaluation Icons
// Shows move quality icons on pieces after moves

class ChessAnalysis {
    constructor() {
        this.chess = new Chess();
        this.stockfish = new StockfishEngine();
        this.moveHistory = [];
        this.evaluations = [];
        this.currentMove = 0;
        this.isAnalyzing = false;
        
        this.initializeBoard();
        this.setupEventListeners();
        this.updateDisplay();
    }

    initializeBoard() {
        const board = document.getElementById('chess-board');
        board.innerHTML = '';
        
        // Create 64 squares
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const square = document.createElement('div');
                square.className = `square ${(rank + file) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.square = String.fromCharCode(97 + file) + (8 - rank);
                square.addEventListener('click', () => this.handleSquareClick(square));
                board.appendChild(square);
            }
        }
        
        this.updateBoard();
    }

    setupEventListeners() {
        document.getElementById('load-pgn-btn').addEventListener('click', () => this.loadPGN());
        document.getElementById('analyze-btn').addEventListener('click', () => this.analyzePosition());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetBoard());
    }

    loadPGN() {
        const pgnInput = document.getElementById('pgn-input').value.trim();
        if (!pgnInput) return;
        
        try {
            this.chess.loadPgn(pgnInput);
            this.moveHistory = this.chess.history({ verbose: true });
            this.evaluations = [];
            this.currentMove = this.moveHistory.length;
            this.updateDisplay();
            this.updateBoard();
            this.analyzePosition();
        } catch (error) {
            alert('Invalid PGN format');
        }
    }

    async analyzePosition() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.updateStatus('Analyzing position...', 'analyzing');
        
        try {
            const fen = this.chess.fen();
            const evaluation = await this.stockfish.evaluate(fen, 15);
            
            // Store evaluation for current position
            this.evaluations[this.currentMove] = evaluation.evaluation;
            
            // Update evaluation bar
            this.updateEvaluationBar(evaluation.evaluation);
            
            // If we have a previous move, classify it
            if (this.currentMove > 0) {
                const moveClassification = this.classifyMove(this.evaluations[this.currentMove - 1], evaluation.evaluation);
                this.addMoveIcon(this.currentMove - 1, moveClassification);
            }
            
            this.updateStatus('Analysis complete', 'ready');
        } catch (error) {
            console.error('Analysis error:', error);
            this.updateStatus('Analysis failed', 'ready');
        } finally {
            this.isAnalyzing = false;
        }
    }

    classifyMove(prevEval, currentEval) {
        const evalChange = Math.abs(currentEval - prevEval);
        
        // Determine if it's a book move (opening)
        if (this.isBookMove()) {
            return { type: 'book', emoji: '📖' };
        }
        
        // Determine if it's a brilliant move (sacrifice)
        if (this.isBrilliantMove(prevEval, currentEval)) {
            return { type: 'brilliant', emoji: '‼️' };
        }
        
        // Classify based on evaluation change
        if (evalChange <= 0.1) {
            return { type: 'best', emoji: '⭐' };
        } else if (evalChange <= 0.2) {
            return { type: 'excellent', emoji: '👍' };
        } else if (evalChange <= 0.5) {
            return { type: 'good', emoji: '✅' };
        } else if (evalChange <= 1.2) {
            return { type: 'inaccuracy', emoji: '!?' };
        } else if (evalChange <= 2.0) {
            return { type: 'mistake', emoji: '?' };
        } else {
            return { type: 'blunder', emoji: '??' };
        }
    }

    isBookMove() {
        // Simple book move detection - first 10 moves are often book
        return this.currentMove < 10;
    }

    isBrilliantMove(prevEval, currentEval) {
        // Check if a piece was sacrificed but it's actually good
        const evalChange = currentEval - prevEval;
        const isWhiteToMove = this.chess.turn() === 'w';
        
        // If evaluation improved significantly after a capture, it might be brilliant
        if (Math.abs(evalChange) > 1.0) {
            const lastMove = this.moveHistory[this.currentMove - 1];
            if (lastMove && lastMove.captured) {
                // Check if we captured a lower value piece with a higher value piece
                const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
                const capturedValue = pieceValues[lastMove.captured] || 0;
                const capturingValue = pieceValues[lastMove.piece] || 0;
                
                if (capturingValue > capturedValue && evalChange > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }

    addMoveIcon(moveIndex, classification) {
        const move = this.moveHistory[moveIndex];
        if (!move) return;
        
        const square = document.querySelector(`[data-square="${move.to}"]`);
        if (!square) return;
        
        // Remove existing icon
        const existingIcon = square.querySelector('.move-icon');
        if (existingIcon) {
            existingIcon.remove();
        }
        
        // Add new icon
        const icon = document.createElement('div');
        icon.className = `move-icon ${classification.type}`;
        icon.textContent = classification.emoji;
        square.appendChild(icon);
    }

    updateEvaluationBar(evaluation) {
        const fill = document.getElementById('evaluation-fill');
        const text = document.getElementById('evaluation-text');
        
        // Convert evaluation to percentage (0-100)
        let percentage = 50; // Neutral position
        
        if (evaluation > 0) {
            // White advantage
            percentage = Math.min(50 + (evaluation * 10), 100);
        } else if (evaluation < 0) {
            // Black advantage
            percentage = Math.max(50 + (evaluation * 10), 0);
        }
        
        fill.style.width = percentage + '%';
        text.textContent = evaluation > 0 ? '+' + evaluation.toFixed(1) : evaluation.toFixed(1);
    }

    handleSquareClick(square) {
        const squareName = square.dataset.square;
        
        if (this.selectedSquare) {
            // Try to make a move
            const move = this.chess.move({
                from: this.selectedSquare,
                to: squareName,
                promotion: 'q' // Always promote to queen for simplicity
            });
            
            if (move) {
                this.moveHistory = this.chess.history({ verbose: true });
                this.currentMove = this.moveHistory.length;
                this.updateDisplay();
                this.updateBoard();
                this.analyzePosition();
            }
            
            this.clearSelection();
        } else {
            // Select square
            this.clearSelection();
            square.classList.add('selected');
            this.selectedSquare = squareName;
        }
    }

    clearSelection() {
        document.querySelectorAll('.square.selected').forEach(sq => {
            sq.classList.remove('selected');
        });
        this.selectedSquare = null;
    }

    updateBoard() {
        const board = this.chess.board();
        
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const square = document.querySelector(`[data-square="${String.fromCharCode(97 + file) + (8 - rank)}"]`);
                const piece = board[rank][file];
                
                // Clear existing piece
                square.innerHTML = '';
                
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = 'piece';
                    pieceElement.style.backgroundImage = `url('pieces/${piece.color}${piece.type.toUpperCase()}.png')`;
                    square.appendChild(pieceElement);
                }
            }
        }
    }

    updateDisplay() {
        this.updateMoveList();
    }

    updateMoveList() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = '';
        
        for (let i = 0; i < this.moveHistory.length; i++) {
            const move = this.moveHistory[i];
            const moveItem = document.createElement('div');
            moveItem.className = `move-item ${i === this.currentMove - 1 ? 'current' : ''}`;
            
            const moveNumber = Math.floor(i / 2) + 1;
            const isWhiteMove = i % 2 === 0;
            
            moveItem.innerHTML = `
                <span class="move-number">${isWhiteMove ? moveNumber + '.' : ''}</span>
                <span class="move-text">${move.san}</span>
                <span class="move-evaluation">${this.evaluations[i] ? (this.evaluations[i] > 0 ? '+' + this.evaluations[i].toFixed(1) : this.evaluations[i].toFixed(1)) : ''}</span>
            `;
            
            moveItem.addEventListener('click', () => this.goToMove(i));
            moveList.appendChild(moveItem);
        }
    }

    goToMove(moveIndex) {
        // Reset to start
        this.chess.reset();
        
        // Replay moves up to the selected one
        for (let i = 0; i <= moveIndex; i++) {
            this.chess.move(this.moveHistory[i].san);
        }
        
        this.currentMove = moveIndex + 1;
        this.updateDisplay();
        this.updateBoard();
    }

    resetBoard() {
        this.chess.reset();
        this.moveHistory = [];
        this.evaluations = [];
        this.currentMove = 0;
        this.clearSelection();
        this.updateDisplay();
        this.updateBoard();
        this.updateEvaluationBar(0);
        this.updateStatus('Ready to analyze', 'ready');
    }

    updateStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessAnalysis();
});
