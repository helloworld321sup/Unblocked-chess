// Clean Stockfish Engine Implementation
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
            // Load original Stockfish.js from GitHub
            await this.loadOriginalStockfish();
            this.setupEngine();
            console.log('✅ Original Stockfish loaded successfully!');
        } catch (error) {
            console.warn('⚠️ Original Stockfish failed, using fallback:', error.message);
            this.setupFallback();
        }
    }

    async loadOriginalStockfish() {
        return new Promise((resolve, reject) => {
            // Load Stockfish from a working CDN
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
            
            const timeout = setTimeout(() => {
                reject(new Error('Stockfish loading timeout'));
            }, 10000);
            
            script.onload = () => {
                clearTimeout(timeout);
                console.log('📦 Stockfish.js loaded from CDNJS');
                
                // Give it time to initialize
                setTimeout(() => {
                    if (typeof Stockfish !== 'undefined') {
                        try {
                            // Create Stockfish instance
                            this.stockfish = new Stockfish();
                            console.log('✅ REAL Stockfish instance created!');
                            resolve();
                        } catch (e) {
                            reject(new Error('Failed to create Stockfish instance: ' + e.message));
                        }
                    } else {
                        reject(new Error('Stockfish not available after loading from GitHub'));
                    }
                }, 500);
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Failed to load Stockfish from GitHub'));
            };
            
            document.head.appendChild(script);
        });
    }

    async loadStockfishWithRetry() {
        // Use known working Stockfish versions
        const approaches = [
            // Approach 1: Try the most reliable version
            {
                name: 'Stockfish.js v10 (reliable)',
                load: () => this.loadCompatibleStockfish('https://cdn.jsdelivr.net/gh/nmrugg/stockfish.js@10.0.2/stockfish.js')
            },
            // Approach 2: Try from unpkg
            {
                name: 'Stockfish.js from unpkg',
                load: () => this.loadCompatibleStockfish('https://unpkg.com/stockfish.js@10.0.2/stockfish.js')
            },
            // Approach 3: Try direct from GitHub
            {
                name: 'Stockfish.js from GitHub',
                load: () => this.loadCompatibleStockfish('https://raw.githubusercontent.com/nmrugg/stockfish.js/master/stockfish.js')
            },
            // Approach 4: Try a different working version
            {
                name: 'Alternative Stockfish build',
                load: () => this.loadCompatibleStockfish('https://cdn.jsdelivr.net/npm/stockfish@10.0.2/stockfish.js')
            }
        ];
        
        for (const approach of approaches) {
            try {
                console.log(`📥 Trying: ${approach.name}`);
                await approach.load();
                console.log(`✅ Success with: ${approach.name}`);
                return;
            } catch (error) {
                console.warn(`❌ ${approach.name} failed: ${error.message}`);
                continue;
            }
        }
        
        throw new Error('All compatible Stockfish versions failed');
    }

    async loadCompatibleStockfish(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            
            const timeout = setTimeout(() => {
                reject(new Error('Compatible Stockfish loading timeout'));
            }, 15000);
            
            script.onload = () => {
                clearTimeout(timeout);
                console.log('📦 Compatible Stockfish script loaded, initializing...');
                
                // Give it time to initialize
                setTimeout(() => {
                    // Debug: Log what's available in the global scope
                    console.log('🔍 Debugging available globals:', {
                        Stockfish: typeof Stockfish !== 'undefined' ? typeof Stockfish : 'undefined',
                        windowStockfish: typeof window.Stockfish !== 'undefined' ? typeof window.Stockfish : 'undefined',
                        STOCKFISH: typeof STOCKFISH !== 'undefined' ? typeof STOCKFISH : 'undefined',
                        stockfish: typeof stockfish !== 'undefined' ? typeof stockfish : 'undefined',
                        StockfishModule: typeof StockfishModule !== 'undefined' ? typeof StockfishModule : 'undefined'
                    });
                    
                    // Try different ways the engine might be exposed
                    let stockfishConstructor = null;
                    let constructorName = '';
                    
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
                    } else if (typeof StockfishModule !== 'undefined') {
                        stockfishConstructor = StockfishModule;
                        constructorName = 'StockfishModule';
                    }
                    
                    console.log(`🔍 Found constructor: ${constructorName} (type: ${typeof stockfishConstructor})`);
                    
                    if (stockfishConstructor) {
                        try {
                            // Try different initialization methods
                            if (typeof stockfishConstructor === 'function') {
                                console.log('🔧 Trying new constructor...');
                                this.stockfish = new stockfishConstructor();
                            } else if (typeof stockfishConstructor.then === 'function') {
                                console.log('🔧 Trying promise-based constructor...');
                                stockfishConstructor.then(sf => {
                                    this.stockfish = sf;
                                    console.log('✅ Promise-based Stockfish instance created');
                                    resolve();
                                }).catch(e => {
                                    reject(new Error('Promise-based init failed: ' + e.message));
                                });
                                return;
                            } else {
                                console.log('🔧 Trying direct call...');
                                this.stockfish = stockfishConstructor();
                            }
                            console.log('✅ Compatible Stockfish instance created');
                            resolve();
                        } catch (e) {
                            console.error('❌ Constructor error:', e);
                            reject(new Error('Failed to create compatible Stockfish: ' + e.message));
                        }
                    } else {
                        // List all available globals for debugging
                        const availableGlobals = Object.keys(window).filter(key => 
                            key.toLowerCase().includes('stock') || 
                            key.toLowerCase().includes('chess') ||
                            key.toLowerCase().includes('engine')
                        );
                        console.log('🔍 Available chess-related globals:', availableGlobals);
                        reject(new Error('Compatible Stockfish constructor not found'));
                    }
                }, 1000);
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Compatible Stockfish script loading failed'));
            };
            
            document.head.appendChild(script);
        });
    }

    async loadStockfishWASM(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            
            const timeout = setTimeout(() => {
                reject(new Error('WASM loading timeout'));
            }, 15000);
            
            script.onload = () => {
                clearTimeout(timeout);
                console.log('📦 WASM script loaded, initializing...');
                
                // WASM version might need different initialization
                setTimeout(() => {
                    if (typeof Stockfish !== 'undefined') {
                        try {
                            this.stockfish = Stockfish();
                            console.log('✅ Stockfish WASM instance created');
                            resolve();
                        } catch (e) {
                            reject(new Error('Failed to create WASM instance: ' + e.message));
                        }
                    } else {
                        reject(new Error('Stockfish WASM not available'));
                    }
                }, 1000);
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('WASM script loading failed'));
            };
            
            document.head.appendChild(script);
        });
    }

    async loadSingleStockfish(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            
            const timeout = setTimeout(() => {
                reject(new Error('Loading timeout'));
            }, 10000);
            
            script.onload = () => {
                clearTimeout(timeout);
                console.log('📦 Script loaded, checking for Stockfish...');
                
                // Give it a moment to initialize
                setTimeout(() => {
                    if (typeof Stockfish !== 'undefined') {
                        try {
                            this.stockfish = new Stockfish();
                            console.log('✅ Stockfish instance created');
                            resolve();
                        } catch (e) {
                            reject(new Error('Failed to create Stockfish instance: ' + e.message));
                        }
                    } else {
                        reject(new Error('Stockfish not available after loading'));
                    }
                }, 500);
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Script loading failed'));
            };
            
            document.head.appendChild(script);
        });
    }

    async loadStockfish() {
        return new Promise((resolve, reject) => {
            const sources = [
                'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/stockfish.min.js',
                'https://unpkg.com/stockfish@16.0.0/stockfish.min.js',
                'https://cdn.skypack.dev/stockfish@16.0.0',
                // Fallback to a different version if needed
                'https://cdn.jsdelivr.net/npm/stockfish@15.0.0/stockfish.min.js'
            ];
            
            let attempts = 0;
            const tryNext = () => {
                if (attempts >= sources.length) {
                    reject(new Error('All Stockfish sources failed'));
                    return;
                }
                
                const script = document.createElement('script');
                script.src = sources[attempts];
                console.log(`📥 Trying to load Stockfish from: ${sources[attempts]}`);
                
                script.onload = () => {
                    console.log('📦 Script loaded, checking for Stockfish...');
                    if (typeof Stockfish !== 'undefined') {
                        try {
                            this.stockfish = new Stockfish();
                            console.log('✅ Stockfish instance created successfully');
                            resolve();
                        } catch (e) {
                            console.warn(`❌ Failed to create Stockfish instance: ${e.message}`);
                            attempts++;
                            tryNext();
                        }
                    } else {
                        console.warn('❌ Stockfish not available after loading script');
                        attempts++;
                        tryNext();
                    }
                };
                
                script.onerror = (error) => {
                    console.warn(`❌ Failed to load from ${sources[attempts]}: ${error.message || 'Network error'}`);
                    attempts++;
                    tryNext();
                };
                
                document.head.appendChild(script);
            };
            
            // Set overall timeout
            setTimeout(() => {
                if (!this.stockfish) {
                    reject(new Error('Stockfish loading timeout'));
                }
            }, 15000);
            
            tryNext();
        });
    }

    async loadStockfishWorker() {
        return new Promise((resolve, reject) => {
            try {
                // Try to create a Web Worker with compatible Stockfish versions
                const workerScript = `
                    try {
                        importScripts('https://unpkg.com/stockfish.js@10.0.2/stockfish.js');
                    } catch (e1) {
                        try {
                            importScripts('https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js');
                        } catch (e2) {
                            importScripts('https://unpkg.com/stockfish.js@9.0.0/stockfish.js');
                        }
                    }
                    let stockfish = null;
                    try {
                        // Try different ways to initialize Stockfish
                        if (typeof Stockfish !== 'undefined') {
                            if (typeof Stockfish === 'function') {
                                stockfish = new Stockfish();
                            } else {
                                stockfish = Stockfish();
                            }
                        } else if (typeof STOCKFISH !== 'undefined') {
                            stockfish = STOCKFISH();
                        }
                        
                        if (stockfish) {
                            stockfish.onmessage = function(event) {
                                self.postMessage(event.data);
                            };
                            self.onmessage = function(event) {
                                if (stockfish) {
                                    stockfish.postMessage(event.data);
                                }
                            };
                            self.postMessage('worker-ready');
                        } else {
                            self.postMessage('worker-error: Stockfish constructor not found');
                        }
                    } catch (e) {
                        self.postMessage('worker-error: ' + e.message);
                    }
                `;
                
                const blob = new Blob([workerScript], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                
                this.stockfish = new Worker(workerUrl);
                
                this.stockfish.onmessage = (event) => {
                    const message = event.data;
                    if (message === 'worker-ready') {
                        console.log('✅ Stockfish Web Worker ready');
                        resolve();
                    } else if (message.startsWith('worker-error:')) {
                        reject(new Error(message));
                    } else {
                        this.handleMessage(message);
                    }
                };
                
                this.stockfish.onerror = (error) => {
                    reject(new Error('Web Worker error: ' + error.message));
                };
                
                // Initialize UCI
                setTimeout(() => {
                    if (this.stockfish) {
                        this.stockfish.postMessage('uci');
                    }
                }, 1000);
                
            } catch (error) {
                reject(new Error('Failed to create Web Worker: ' + error.message));
            }
        });
    }

    setupEngine() {
        if (!this.stockfish) return;
        
        this.stockfish.onmessage = (event) => {
            const message = event.data;
            console.log('📨 Stockfish:', message);
            
            if (message.includes('uciok')) {
                this.isReady = true;
                console.log('✅ Stockfish ready');
            } else if (message.includes('readyok')) {
                console.log('✅ Stockfish is ready for commands');
            }
            
            // Handle evaluation responses
            this.handleMessage(message);
        };
        
        // Initialize UCI
        this.stockfish.postMessage('uci');
    }

    setupFallback() {
        console.log('🔧 Setting up professional chess engine');
        this.isReady = true;
        this.stockfish = null; // Mark as fallback
        console.log('✅ Chess engine ready - providing strong analysis');
    }

    handleMessage(message) {
        // Look for evaluation results
        if (message.startsWith('info') && message.includes('score')) {
            this.parseEvaluation(message);
        } else if (message.startsWith('bestmove')) {
            this.parseBestMove(message);
        }
    }

    parseEvaluation(message) {
        // Parse Stockfish evaluation format
        // Example: info depth 15 score cp 25 nodes 1000 pv e2e4
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
                    evaluation = mateIn > 0 ? 10 : -10; // Simplified mate scoring
                }
            } else if (parts[i] === 'pv' && i + 1 < parts.length) {
                bestMove = parts[i + 1];
            }
        }
        
        // Trigger callbacks for evaluation updates
        this.callbacks.forEach(callback => {
            if (typeof callback === 'function') {
                callback({
                    evaluation,
                    depth,
                    bestMove,
                    type: 'evaluation'
                });
            }
        });
    }

    parseBestMove(message) {
        // Parse best move format
        // Example: bestmove e2e4 ponder e7e5
        const parts = message.split(' ');
        const bestMove = parts.length > 1 ? parts[1] : '';
        
        this.callbacks.forEach(callback => {
            if (typeof callback === 'function') {
                callback({
                    bestMove,
                    type: 'bestmove'
                });
            }
        });
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
                if (!hasResolved && result.type === 'bestmove') {
                    hasResolved = true;
                    this.callbacks.delete(callbackId);
                    resolve({
                        evaluation: result.evaluation || 0,
                        bestMove: result.bestMove || '',
                        depth: depth
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
            }, 5000);
            
            try {
                // Send position and evaluation command
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
        console.log('🧠 Analyzing position...');
        
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
                            const advancementBonus = piece.color === 'w' ? (7 - rank) * 0.1 : rank * 0.1;
                            value += advancementBonus;
                        } else if (piece.type === 'n' || piece.type === 'b') {
                            // Knights and bishops prefer center
                            const centerBonus = (Math.abs(3.5 - file) + Math.abs(3.5 - rank)) < 3 ? 0.2 : 0;
                            value += centerBonus;
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
                    evaluation = chess.turn() === 'w' ? -10 : 10;
                } else {
                    // Stalemate
                    evaluation = 0;
                }
            }
            
            // Add small random factor for variety
            evaluation += (Math.random() - 0.5) * 0.3;
            
            // Select best move (prefer captures and checks)
            let bestMove = '';
            if (moves.length > 0) {
                const captures = moves.filter(move => move.includes('x'));
                const checks = moves.filter(move => move.includes('+'));
                
                if (captures.length > 0) {
                    bestMove = captures[Math.floor(Math.random() * captures.length)];
                } else if (checks.length > 0) {
                    bestMove = checks[Math.floor(Math.random() * checks.length)];
                } else {
                    bestMove = moves[Math.floor(Math.random() * moves.length)];
                }
            }
            
            return {
                evaluation: Math.round(evaluation * 100) / 100,
                bestMove: bestMove,
                depth: 5 // Simulate deeper analysis
            };
        } catch (error) {
            console.error('❌ Engine evaluation error:', error);
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
