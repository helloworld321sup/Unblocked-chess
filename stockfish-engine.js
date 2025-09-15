// Stockfish Engine Implementation based on WintrCat/freechess
// This creates a reliable Stockfish integration for chess analysis

class StockfishEngine {
    constructor() {
        this.worker = null;
        this.depth = 0;
        this.isReady = false;
        this.init();
    }

    async init() {
        try {
            // Try to create Web Worker with Stockfish
            this.worker = new Worker('stockfish-worker.js');
            
            this.worker.onmessage = (event) => {
                this.handleMessage(event.data);
            };
            
            this.worker.onerror = (error) => {
                console.error('Stockfish worker error:', error);
                this.setupMockEngine();
            };
            
            // Wait for worker to be ready
            await this.waitForReady();
            
        } catch (error) {
            console.error('Failed to initialize Stockfish:', error);
            this.setupMockEngine();
        }
    }

    setupMockEngine() {
        console.log('Using mock engine');
        this.isReady = true;
    }

    handleMessage(message) {
        if (message.includes('uciok')) {
            this.isReady = true;
            // Initialize MultiPV after UCI is ready
            this.worker.postMessage('setoption name MultiPV value 2');
        }
    }

    async evaluate(fen, targetDepth, verbose = false) {
        if (!this.isReady) {
            await this.waitForReady();
        }

        if (!this.worker) {
            return this.mockEvaluation(fen, targetDepth);
        }

        return new Promise((resolve) => {
            this.worker.postMessage(`position fen ${fen}`);
            this.worker.postMessage(`go depth ${targetDepth}`);

            const messages = [];
            const lines = [];

            const messageHandler = (event) => {
                const message = event.data;
                messages.unshift(message);

                if (verbose) console.log(message);

                // Get latest depth for progress monitoring
                const latestDepth = parseInt(message.match(/(?:depth )(\d+)/)?.[1] || "0");
                this.depth = Math.max(latestDepth, this.depth);

                // Best move or checkmate log indicates end of search
                if (message.startsWith("bestmove") || message.includes("depth 0")) {
                    this.worker.removeEventListener('message', messageHandler);
                    
                    const searchMessages = messages.filter(msg => msg.startsWith("info depth"));

                    for (const searchMessage of searchMessages) {
                        // Extract depth, MultiPV line ID and evaluation from search message
                        const idString = searchMessage.match(/(?:multipv )(\d+)/)?.[1];
                        const depthString = searchMessage.match(/(?:depth )(\d+)/)?.[1];
                        const moveUCI = searchMessage.match(/(?: pv )(.+?)(?= |$)/)?.[1];

                        const evaluation = {
                            type: searchMessage.includes(" cp ") ? "cp" : "mate",
                            value: parseInt(searchMessage.match(/(?:(?:cp )|(?:mate ))([\d-]+)/)?.[1] || "0")
                        };

                        // Invert evaluation if black to play since scores are from black perspective
                        // and we want them always from the perspective of white
                        if (fen.includes(" b ")) {
                            evaluation.value *= -1;
                        }

                        // If any piece of data from message is missing, discard message
                        if (!idString || !depthString || !moveUCI) continue;

                        const id = parseInt(idString);
                        const depth = parseInt(depthString);

                        // Discard if target depth not reached or lineID already present
                        if (depth != targetDepth || lines.some(line => line.id == id)) continue;
                        
                        lines.push({
                            id,
                            depth,
                            evaluation,
                            moveUCI
                        });
                    }

                    resolve(lines);
                }
            };

            this.worker.addEventListener('message', messageHandler);
        });
    }

    async waitForReady() {
        return new Promise((resolve) => {
            const checkReady = () => {
                if (this.isReady) {
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    mockEvaluation(fen, targetDepth) {
        // Create a mock evaluation for testing
        const chess = new Chess(fen);
        const moves = chess.moves({ verbose: true });
        
        if (moves.length === 0) {
            return [{
                id: 1,
                depth: targetDepth,
                evaluation: { type: "mate", value: 0 },
                moveUCI: ""
            }];
        }

        // Simple evaluation based on material
        let evaluation = 0;
        const board = chess.board();
        
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece) {
                    const values = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
                    const value = values[piece.type] || 0;
                    evaluation += piece.color === 'w' ? value : -value;
                }
            }
        }

        // Add some randomness for different lines
        const lines = [];
        for (let i = 0; i < Math.min(2, moves.length); i++) {
            const move = moves[i];
            const moveUCI = move.from + move.to + (move.promotion || '');
            
            lines.push({
                id: i + 1,
                depth: targetDepth,
                evaluation: {
                    type: "cp",
                    value: evaluation + (Math.random() - 0.5) * 200
                },
                moveUCI: moveUCI
            });
        }

        return lines;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockfishEngine;
} else {
    window.StockfishEngine = StockfishEngine;
}
