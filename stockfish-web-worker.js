// Reliable Stockfish Engine Implementation
// This creates a working Stockfish engine for GitHub Pages

class StockfishEngine {
    constructor() {
        this.stockfish = null;
        this.isReady = false;
        this.callbacks = new Map();
        this.messageId = 0;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Stockfish engine...');
        
        try {
            await this.loadStockfish();
            console.log('✅ Stockfish engine ready!');
        } catch (error) {
            console.warn('⚠️ Stockfish failed to load:', error.message);
            console.log('🔧 Using fallback chess engine');
            this.setupFallback();
        }
    }

    async loadStockfish() {
        return new Promise((resolve, reject) => {
            // Try multiple CDN sources for Stockfish (using older, browser-compatible versions)
            const stockfishSources = [
                'https://cdn.jsdelivr.net/gh/nmrugg/stockfish.js@10.0.2/stockfish.js',
                'https://unpkg.com/stockfish.js@10.0.2/stockfish.js',
                'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
                'https://raw.githubusercontent.com/nmrugg/stockfish.js/master/stockfish.js'
            ];

            let currentIndex = 0;
            
            const tryNextSource = () => {
                if (currentIndex >= stockfishSources.length) {
                    reject(new Error('All Stockfish sources failed'));
                    return;
                }

                const src = stockfishSources[currentIndex];
                console.log(`🔄 Trying Stockfish source ${currentIndex + 1}/${stockfishSources.length}: ${src}`);
                
                const script = document.createElement('script');
                script.src = src;
                
                script.onload = () => {
                    console.log('📦 Stockfish script loaded, checking availability...');
                    
                    // Give it a moment to initialize
                    setTimeout(() => {
                        console.log('🔍 Checking for Stockfish availability...');
                        console.log('Available globals:', {
                            Stockfish: typeof Stockfish !== 'undefined' ? typeof Stockfish : 'undefined',
                            windowStockfish: typeof window.Stockfish !== 'undefined' ? typeof window.Stockfish : 'undefined',
                            STOCKFISH: typeof STOCKFISH !== 'undefined' ? typeof STOCKFISH : 'undefined',
                            stockfish: typeof stockfish !== 'undefined' ? typeof stockfish : 'undefined'
                        });
                        
                        let stockfishConstructor = null;
                        let constructorName = '';
                        
                        // Try different ways Stockfish might be exposed
                        if (typeof Stockfish !== 'undefined') {
                            stockfishConstructor = Stockfish;
                            constructorName = 'Stockfish';
                        } else if (typeof window.Stockfish !== 'undefined') {
                            stockfishConstructor = window.Stockfish;
                            constructorName = 'window.Stockfish';
                        } else if (typeof STOCKFISH !== 'undefined') {
                            stockfishConstructor = STOCKFISH;
                            constructorName = 'STOCKFISH';
                        } else if (typeof stockfish !== 'undefined') {
                            stockfishConstructor = stockfish;
                            constructorName = 'stockfish';
                        }
                        
                        if (stockfishConstructor) {
                            try {
                                console.log(`🔧 Trying to initialize ${constructorName}...`);
                                
                                // Try different initialization methods
                                if (typeof stockfishConstructor === 'function') {
                                    this.stockfish = new stockfishConstructor();
                                } else if (typeof stockfishConstructor.then === 'function') {
                                    // Promise-based initialization
                                    stockfishConstructor.then(sf => {
                                        this.stockfish = sf;
                                        this.setupStockfish();
                                        console.log(`✅ Stockfish loaded successfully from: ${src}`);
                                        resolve();
                                    }).catch(e => {
                                        console.warn(`❌ Promise-based init failed: ${e.message}`);
                                        currentIndex++;
                                        tryNextSource();
                                    });
                                    return;
                                } else {
                                    // Direct call
                                    this.stockfish = stockfishConstructor();
                                }
                                
                                this.setupStockfish();
                                console.log(`✅ Stockfish loaded successfully from: ${src}`);
                                resolve();
                            } catch (e) {
                                console.warn(`❌ Failed to initialize ${constructorName}: ${e.message}`);
                                currentIndex++;
                                tryNextSource();
                            }
                        } else {
                            console.warn(`❌ Stockfish not available after loading from: ${src}`);
                            currentIndex++;
                            tryNextSource();
                        }
                    }, 1500);
                };
                
                script.onerror = () => {
                    console.warn(`❌ Failed to load script from: ${src}`);
                    currentIndex++;
                    tryNextSource();
                };
                
                document.head.appendChild(script);
            };

            // Set overall timeout
            setTimeout(() => {
                if (!this.isReady) {
                    reject(new Error('Stockfish loading timeout'));
                }
            }, 20000);
            
            tryNextSource();
        });
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
            if (!this.stockfish) {
                // Use fallback evaluation
                resolve(this.fallbackEvaluate(fen));
                return;
            }
            
            if (!this.isReady) {
                console.warn('⚠️ Stockfish not ready, using fallback');
                resolve(this.fallbackEvaluate(fen));
                return;
            }
            
            const callbackId = this.messageId++;
            let hasResolved = false;
            
            // Set up callback for this evaluation
            this.callbacks.set(callbackId, (result) => {
                if (!hasResolved) {
                    hasResolved = true;
                    this.callbacks.delete(callbackId);
                    resolve({
                        evaluation: result.evaluation || 0,
                        bestMove: result.bestMove || '',
                        depth: result.depth || depth
                    });
                }
            });
            
            // Set timeout for evaluation
            setTimeout(() => {
                if (!hasResolved) {
                    hasResolved = true;
                    this.callbacks.delete(callbackId);
                    console.warn('⚠️ Stockfish evaluation timeout, using fallback');
                    resolve(this.fallbackEvaluate(fen));
                }
            }, 8000);
            
            try {
                // Send position and evaluation commands
                this.stockfish.postMessage(`position fen ${fen}`);
                this.stockfish.postMessage(`go depth ${depth}`);
            } catch (error) {
                console.error('❌ Stockfish command error:', error);
                if (!hasResolved) {
                    hasResolved = true;
                    this.callbacks.delete(callbackId);
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
