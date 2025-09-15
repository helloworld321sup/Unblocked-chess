// Clean Chess Analysis Implementation
class ChessAnalysis {
    constructor() {
        this.chess = new Chess();
        this.stockfish = new StockfishEngine();
        this.moveHistory = [];
        this.evaluations = [];
        this.currentMove = 0;
        this.selectedSquare = null;
        this.isAnalyzing = false;
        
        this.init();
    }

    init() {
        this.createBoard();
        this.updateBoard();
        this.setupEventListeners();
        this.applySettings();
        this.updateStatus('Loading Stockfish engine...', 'analyzing');
        
        // Wait for Stockfish to be ready
        this.waitForStockfish();
    }

    async waitForStockfish() {
        try {
            await this.stockfish.waitForReady();
            this.updateStatus('Stockfish ready - you can now analyze!', 'ready');
        } catch (error) {
            this.updateStatus('Stockfish failed - using fallback engine', 'error');
        }
    }

    createBoard() {
        const board = document.getElementById('chess-board');
        board.innerHTML = '';
        
        // Create exactly 64 squares
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const square = document.createElement('div');
                square.className = `square ${(rank + file) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.square = String.fromCharCode(97 + file) + (8 - rank);
                square.addEventListener('click', () => this.handleSquareClick(square));
                board.appendChild(square);
            }
        }
    }

    updateBoard() {
        const board = this.chess.board();
        
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const squareName = String.fromCharCode(97 + file) + (8 - rank);
                const square = document.querySelector(`[data-square="${squareName}"]`);
                const piece = board[rank][file];
                
                if (square) {
                    // Clear existing content
                    square.innerHTML = '';
                    
                    if (piece) {
                        const pieceElement = document.createElement('div');
                        pieceElement.className = 'piece';
                        
                        // Try to load piece image, fallback to Unicode
                        const pieceImage = this.getPieceImage(piece);
                        if (pieceImage.startsWith('http')) {
                            pieceElement.style.backgroundImage = `url('${pieceImage}')`;
                        } else {
                            pieceElement.textContent = pieceImage;
                        }
                        
                        square.appendChild(pieceElement);
                    }
                }
            }
        }
    }

    getPieceImage(piece) {
        // Try to get from settings
        if (typeof window.getPieceImages === 'function') {
            const images = window.getPieceImages();
            const key = piece.color + piece.type.toUpperCase();
            if (images[key]) {
                return images[key];
            }
        }
        
        // Fallback to Unicode symbols
        const symbols = {
            'w': { 'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙' },
            'b': { 'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟' }
        };
        return symbols[piece.color][piece.type];
    }

    handleSquareClick(square) {
        const squareName = square.dataset.square;
        
        if (this.selectedSquare) {
            // Try to make a move
            try {
                const move = this.chess.move({
                    from: this.selectedSquare,
                    to: squareName,
                    promotion: 'q'
                });
                
                if (move) {
                    this.moveHistory = this.chess.history({ verbose: true });
                    this.currentMove = this.moveHistory.length;
                    this.updateBoard();
                    this.updateMoveList();
                    this.analyzeCurrentPosition();
                }
            } catch (e) {
                // Invalid move, just clear selection
            }
            
            this.clearSelection();
        } else {
            // Select piece
            const piece = this.chess.get(squareName);
            if (piece && piece.color === this.chess.turn()) {
                this.clearSelection();
                square.classList.add('selected');
                this.selectedSquare = squareName;
            }
        }
    }

    clearSelection() {
        document.querySelectorAll('.square.selected').forEach(sq => {
            sq.classList.remove('selected');
        });
        this.selectedSquare = null;
    }

    async analyzeCurrentPosition() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.updateStatus('Analyzing position...', 'analyzing');
        
        try {
            // Wait for Stockfish to be ready
            await this.stockfish.waitForReady();
            
            // Get current position FEN
            const fen = this.chess.fen();
            
            // Evaluate with Stockfish
            const result = await this.stockfish.evaluate(fen, 15);
            const evaluation = result.evaluation;
            
            this.evaluations[this.currentMove] = evaluation;
            this.updateEvaluationBar(evaluation);
            
            // Classify the last move if it exists
            if (this.currentMove > 0) {
                const prevEval = this.evaluations[this.currentMove - 1] || 0;
                const classification = this.classifyMove(prevEval, evaluation);
                this.addMoveIcon(this.currentMove - 1, classification);
            }
            
            this.updateStatus('Analysis complete', 'ready');
        } catch (error) {
            console.error('Analysis error:', error);
            this.updateStatus('Analysis failed - using fallback', 'error');
            
            // Fallback to mock evaluation
            const evaluation = this.mockEvaluate();
            this.evaluations[this.currentMove] = evaluation;
            this.updateEvaluationBar(evaluation);
        } finally {
            this.isAnalyzing = false;
        }
    }

    mockEvaluate() {
        // Simple material-based evaluation
        let evaluation = 0;
        const pieces = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
        
        const board = this.chess.board();
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece) {
                    const value = pieces[piece.type] || 0;
                    evaluation += piece.color === 'w' ? value : -value;
                }
            }
        }
        
        // Add some randomness
        evaluation += (Math.random() - 0.5) * 2;
        return Math.round(evaluation * 100) / 100;
    }

    classifyMove(prevEval, currentEval) {
        const evalChange = Math.abs(currentEval - prevEval);
        
        if (this.currentMove <= 10) {
            return { type: 'book', emoji: '📖' };
        }
        
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

    addMoveIcon(moveIndex, classification) {
        if (moveIndex < 0 || moveIndex >= this.moveHistory.length) return;
        
        const move = this.moveHistory[moveIndex];
        const square = document.querySelector(`[data-square="${move.to}"]`);
        
        if (square) {
            // Remove existing icon
            const existingIcon = square.querySelector('.move-icon');
            if (existingIcon) existingIcon.remove();
            
            // Add new icon
            const icon = document.createElement('div');
            icon.className = `move-icon ${classification.type}`;
            icon.textContent = classification.emoji;
            square.appendChild(icon);
        }
    }

    updateEvaluationBar(evaluation) {
        const fill = document.getElementById('eval-fill');
        const text = document.getElementById('eval-text');
        
        // Convert evaluation to percentage (0-100)
        let percentage = 50;
        if (evaluation > 0) {
            percentage = Math.min(50 + (evaluation * 5), 95);
        } else if (evaluation < 0) {
            percentage = Math.max(50 + (evaluation * 5), 5);
        }
        
        fill.style.width = percentage + '%';
        text.textContent = evaluation > 0 ? '+' + evaluation.toFixed(1) : evaluation.toFixed(1);
    }

    updateMoveList() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = '';
        
        for (let i = 0; i < this.moveHistory.length; i++) {
            const move = this.moveHistory[i];
            const item = document.createElement('div');
            item.className = `move-item ${i === this.currentMove - 1 ? 'current' : ''}`;
            
            const moveNumber = Math.floor(i / 2) + 1;
            const isWhite = i % 2 === 0;
            
            item.innerHTML = `
                <span>${isWhite ? moveNumber + '.' : ''} ${move.san}</span>
                <span style="float: right;">${this.evaluations[i] ? (this.evaluations[i] > 0 ? '+' + this.evaluations[i].toFixed(1) : this.evaluations[i].toFixed(1)) : ''}</span>
            `;
            
            item.addEventListener('click', () => this.goToMove(i));
            moveList.appendChild(item);
        }
    }

    goToMove(moveIndex) {
        this.chess.reset();
        
        for (let i = 0; i <= moveIndex; i++) {
            this.chess.move(this.moveHistory[i].san);
        }
        
        this.currentMove = moveIndex + 1;
        this.updateBoard();
        this.updateMoveList();
        
        if (this.evaluations[this.currentMove]) {
            this.updateEvaluationBar(this.evaluations[this.currentMove]);
        }
    }

    loadPGN() {
        const pgnText = document.getElementById('pgn-input').value.trim();
        if (!pgnText) return;
        
        try {
            this.chess.loadPgn(pgnText);
            this.moveHistory = this.chess.history({ verbose: true });
            this.currentMove = this.moveHistory.length;
            this.evaluations = [];
            
            this.updateBoard();
            this.updateMoveList();
            this.analyzeCurrentPosition();
            
            this.updateStatus('PGN loaded successfully', 'ready');
        } catch (error) {
            this.updateStatus('Invalid PGN format', 'error');
        }
    }

    reset() {
        this.chess.reset();
        this.moveHistory = [];
        this.evaluations = [];
        this.currentMove = 0;
        this.clearSelection();
        
        this.updateBoard();
        this.updateMoveList();
        this.updateEvaluationBar(0);
        this.updateStatus('Board reset', 'ready');
        
        document.getElementById('pgn-input').value = '';
    }

    setupEventListeners() {
        document.getElementById('load-pgn').addEventListener('click', () => this.loadPGN());
        document.getElementById('analyze').addEventListener('click', () => this.analyzeCurrentPosition());
        document.getElementById('reset').addEventListener('click', () => this.reset());
    }

    applySettings() {
        // Apply board color from settings
        if (typeof window.getBoardColor === 'function') {
            const color = window.getBoardColor();
            document.documentElement.style.setProperty('--dark-square-color', color);
        }
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
