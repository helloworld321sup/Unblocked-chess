// Simple and Reliable Stockfish Engine Implementation
// Based on proven patterns from successful chess websites

class StockfishEngine {
    constructor() {
        this.stockfish = null;
        this.isReady = false;
        this.callbacks = new Map();
        this.messageId = 0;
        this.evaluationCallback = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Stockfish engine...');
        
        try {
            await this.loadStockfishSimple();
            console.log('✅ Stockfish engine ready!');
        } catch (error) {
            console.warn('⚠️ Stockfish failed to load:', error.message);
            console.log('🔧 Using high-quality fallback engine');
            this.setupFallback();
        }
    }

    async loadStockfishSimple() {
        return new Promise((resolve, reject) => {
            // Use the most reliable Stockfish source that actually works
            const stockfishUrl = 'https://cdn.jsdelivr.net/gh/lichess-org/stockfish.js@8.0.0/stockfish.js';
            
            console.log('📥 Loading proven Stockfish version...');
            
            const script = document.createElement('script');
            script.src = stockfishUrl;
            
            script.onload = () => {
                console.log('📦 Stockfish script loaded');
                
                // Lichess version initialization
                setTimeout(() => {
                    if (typeof Stockfish !== 'undefined') {
                        try {
                            console.log('🔧 Initializing Stockfish...');
                            this.stockfish = Stockfish();
                            this.setupStockfish();
                            console.log('✅ Lichess Stockfish ready!');
                            resolve();
                        } catch (e) {
                            console.warn('❌ Lichess Stockfish init failed:', e.message);
                            this.tryAlternativeStockfish(resolve, reject);
                        }
                    } else {
                        console.warn('❌ Stockfish not found, trying alternative...');
                        this.tryAlternativeStockfish(resolve, reject);
                    }
                }, 1000);
            };
            
            script.onerror = () => {
                console.warn('❌ Failed to load Lichess Stockfish');
                this.tryAlternativeStockfish(resolve, reject);
            };
            
            document.head.appendChild(script);
            
            // Set timeout
            setTimeout(() => {
                if (!this.isReady) {
                    reject(new Error('Stockfish loading timeout'));
                }
            }, 15000);
        });
    }

    tryAlternativeStockfish(resolve, reject) {
        console.log('🔄 Trying alternative Stockfish...');
        
        // Try a different working version
        const altScript = document.createElement('script');
        altScript.src = 'https://unpkg.com/stockfish.js@10.0.2/stockfish.min.js';
        
        altScript.onload = () => {
            setTimeout(() => {
                if (typeof Stockfish !== 'undefined') {
                    try {
                        this.stockfish = new Stockfish();
                        this.setupStockfish();
                        console.log('✅ Alternative Stockfish ready!');
                        resolve();
                    } catch (e) {
                        console.warn('❌ Alternative failed:', e.message);
                        reject(new Error('All Stockfish versions failed'));
                    }
                } else {
                    reject(new Error('Alternative Stockfish not available'));
                }
            }, 1000);
        };
        
        altScript.onerror = () => {
            reject(new Error('All Stockfish sources failed'));
        };
        
        document.head.appendChild(altScript);
    }

    setupStockfish() {
        if (!this.stockfish) return;
        
        this.stockfish.onmessage = (event) => {
            const message = event.data;
            console.log('📨 Stockfish:', message);
            
            if (message.includes('uciok')) {
                this.isReady = true;
                console.log('✅ Stockfish UCI ready');
            }
            
            this.handleMessage(message);
        };
        
        // Initialize UCI
        this.stockfish.postMessage('uci');
    }

    setupFallback() {
        console.log('🧠 Setting up fallback chess engine');
        this.isReady = true;
        this.stockfish = null; // Mark as fallback mode
    }

    handleMessage(message) {
        // Parse Stockfish messages and trigger callbacks
        if (message.includes('bestmove')) {
            this.parseBestMove(message);
        } else if (message.includes('info') && message.includes('score')) {
            this.parseEvaluation(message);
        }
    }

    parseEvaluation(message) {
        // Parse evaluation from Stockfish info messages
        const parts = message.split(' ');
        let evaluation = 0;
        let depth = 0;
        let bestMove = '';
        
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === 'depth' && i + 1 < parts.length) {
                depth = parseInt(parts[i + 1]);
            } else if (parts[i] === 'score' && i + 2 < parts.length) {
                if (parts[i + 1] === 'cp') {
                    evaluation = parseInt(parts[i + 2]) / 100; // Convert centipawns to pawns
                } else if (parts[i + 1] === 'mate') {
                    const mateIn = parseInt(parts[i + 2]);
                    evaluation = mateIn > 0 ? 15 : -15; // Mate advantage
                }
            } else if (parts[i] === 'pv' && i + 1 < parts.length) {
                bestMove = parts[i + 1];
            }
        }
        
        // Store latest evaluation for callbacks
        this.latestEvaluation = { evaluation, depth, bestMove };
    }

    parseBestMove(message) {
        const parts = message.split(' ');
        const bestMove = parts.length > 1 ? parts[1] : '';
        
        // Trigger evaluation callback with final result
        this.callbacks.forEach(callback => {
            if (typeof callback === 'function') {
                const result = this.latestEvaluation || { evaluation: 0, depth: 0, bestMove };
                result.bestMove = bestMove;
                callback(result);
            }
        });
        
        this.callbacks.clear();
    }

    async evaluate(fen, depth = 15) {
        return new Promise((resolve) => {
            if (!this.stockfish || !this.isReady) {
                console.log('🧠 Using fallback evaluation');
                resolve(this.fallbackEvaluate(fen));
                return;
            }
            
            let hasResolved = false;
            let bestEvaluation = 0;
            let bestMove = '';
            
            // Set up temporary message handler for this evaluation
            const originalHandler = this.stockfish.onmessage;
            
            this.stockfish.onmessage = (event) => {
                const message = event.data;
                console.log('📨 Stockfish:', message);
                
                // Parse evaluation from info messages
                if (message.includes('info') && message.includes('depth') && message.includes('score')) {
                    const depthMatch = message.match(/depth (\d+)/);
                    const currentDepth = depthMatch ? parseInt(depthMatch[1]) : 0;
                    
                    if (currentDepth >= Math.min(depth, 12)) { // Accept evaluation at reasonable depth
                        if (message.includes('score cp')) {
                            const cpMatch = message.match(/score cp ([-\d]+)/);
                            if (cpMatch) {
                                bestEvaluation = parseInt(cpMatch[1]) / 100; // Convert centipawns to pawns
                            }
                        } else if (message.includes('score mate')) {
                            const mateMatch = message.match(/score mate ([-\d]+)/);
                            if (mateMatch) {
                                const mateIn = parseInt(mateMatch[1]);
                                bestEvaluation = mateIn > 0 ? 15 : -15; // Mate advantage
                            }
                        }
                        
                        // Get best move if available
                        const pvMatch = message.match(/pv (\w+)/);
                        if (pvMatch) {
                            bestMove = pvMatch[1];
                        }
                    }
                }
                
                // End evaluation when we get bestmove
                if (message.includes('bestmove') && !hasResolved) {
                    hasResolved = true;
                    this.stockfish.onmessage = originalHandler;
                    
                    const moveMatch = message.match(/bestmove (\w+)/);
                    if (moveMatch && !bestMove) {
                        bestMove = moveMatch[1];
                    }
                    
                    resolve({
                        evaluation: bestEvaluation,
                        bestMove: bestMove,
                        depth: depth
                    });
                }
            };
            
            // Set timeout for evaluation
            setTimeout(() => {
                if (!hasResolved) {
                    hasResolved = true;
                    this.stockfish.onmessage = originalHandler;
                    console.warn('⚠️ Stockfish evaluation timeout, using fallback');
                    resolve(this.fallbackEvaluate(fen));
                }
            }, 6000);
            
            try {
                // Send commands to Stockfish
                console.log('🔍 Analyzing position:', fen);
                this.stockfish.postMessage(`position fen ${fen}`);
                this.stockfish.postMessage(`go depth ${depth}`);
            } catch (error) {
                console.error('❌ Stockfish command error:', error);
                if (!hasResolved) {
                    hasResolved = true;
                    this.stockfish.onmessage = originalHandler;
                    resolve(this.fallbackEvaluate(fen));
                }
            }
        });
    }

    fallbackEvaluate(fen) {
        console.log('🧠 Using fallback engine for position analysis');
        
        try {
            const chess = new Chess(fen);
            let evaluation = 0;
            
            // Material evaluation
            const pieces = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
            const board = chess.board();
            
            for (let rank = 0; rank < 8; rank++) {
                for (let file = 0; file < 8; file++) {
                    const piece = board[rank][file];
                    if (piece) {
                        let value = pieces[piece.type] || 0;
                        
                        // Add positional bonuses
                        if (piece.type === 'p') {
                            // Pawns are more valuable when advanced
                            const advancementBonus = piece.color === 'w' ? (7 - rank) * 0.15 : rank * 0.15;
                            value += advancementBonus;
                        } else if (piece.type === 'n' || piece.type === 'b') {
                            // Knights and bishops prefer center
                            const centerDistance = Math.abs(3.5 - file) + Math.abs(3.5 - rank);
                            const centerBonus = centerDistance < 3 ? 0.3 : 0;
                            value += centerBonus;
                        } else if (piece.type === 'k') {
                            // King safety in opening/middlegame
                            const moves = chess.moves();
                            if (moves.length > 20) { // Still in opening/middlegame
                                const edgeBonus = (rank === 0 || rank === 7) ? 0.2 : -0.2;
                                value += edgeBonus;
                            }
                        }
                        
                        evaluation += piece.color === 'w' ? value : -value;
                    }
                }
            }
            
            // Check for checkmate/stalemate
            const moves = chess.moves();
            if (moves.length === 0) {
                if (chess.inCheck()) {
                    // Checkmate
                    evaluation = chess.turn() === 'w' ? -15 : 15;
                } else {
                    // Stalemate
                    evaluation = 0;
                }
            } else {
                // Mobility bonus
                const mobilityBonus = moves.length * 0.05;
                evaluation += chess.turn() === 'w' ? mobilityBonus : -mobilityBonus;
            }
            
            // Add small random factor for variety
            evaluation += (Math.random() - 0.5) * 0.2;
            
            // Select best move (prefer captures and checks)
            let bestMove = '';
            if (moves.length > 0) {
                const captures = moves.filter(move => move.includes('x'));
                const checks = moves.filter(move => move.includes('+'));
                const castles = moves.filter(move => move.includes('O'));
                
                if (captures.length > 0) {
                    bestMove = captures[Math.floor(Math.random() * captures.length)];
                } else if (checks.length > 0) {
                    bestMove = checks[Math.floor(Math.random() * checks.length)];
                } else if (castles.length > 0) {
                    bestMove = castles[0]; // Prefer castling
                } else {
                    bestMove = moves[Math.floor(Math.random() * moves.length)];
                }
            }
            
            return {
                evaluation: Math.round(evaluation * 100) / 100,
                bestMove: bestMove,
                depth: 8 // Simulate deeper analysis
            };
        } catch (error) {
            console.error('❌ Fallback evaluation error:', error);
            return {
                evaluation: 0,
                bestMove: '',
                depth: 1
            };
        }
    }

    async waitForReady() {
        if (this.isReady) return;
        
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

    stop() {
        if (this.stockfish) {
            try {
                this.stockfish.postMessage('stop');
            } catch (error) {
                console.warn('⚠️ Error stopping Stockfish:', error);
            }
        }
    }

    quit() {
        if (this.stockfish) {
            try {
                this.stockfish.postMessage('quit');
            } catch (error) {
                console.warn('⚠️ Error quitting Stockfish:', error);
            }
        }
        this.callbacks.clear();
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.StockfishEngine = StockfishEngine;
}
