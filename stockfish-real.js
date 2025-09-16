// REAL Stockfish Integration - Fixed Version
// Uses the actual working Stockfish WASM build

class RealStockfish {
    constructor() {
        this.ready = false;
        this.worker = null;
        this.init();
    }

    async init() {
        console.log('🚀 Loading REAL Stockfish WASM engine...');
        
        try {
            await this.loadRealStockfish();
            console.log('✅ REAL Stockfish WASM loaded successfully!');
        } catch (error) {
            console.error('❌ Failed to load REAL Stockfish:', error);
            throw error;
        }
    }

    async loadRealStockfish() {
        return new Promise((resolve, reject) => {
            // Create a Web Worker with the real Stockfish WASM
            const workerCode = `
                // Load the real Stockfish WASM build
                console.log('Worker: Loading Stockfish WASM...');
                
                // Use the battle-tested niklasf/stockfish.wasm build
                importScripts('https://cdn.jsdelivr.net/gh/niklasf/stockfish.wasm/stockfish.wasm.js');
                
                let stockfish = null;
                let isReady = false;
                
                // Initialize Stockfish WASM (modern way)
                Stockfish().then(sf => {
                    stockfish = sf;
                    console.log('Worker: Stockfish WASM initialized!');
                    
                    // Set up message handling
                    stockfish.onmessage = function(event) {
                        const message = event.data;
                        self.postMessage({type: 'stockfish', message: message});
                        
                        if (message.includes('uciok')) {
                            isReady = true;
                            self.postMessage({type: 'ready'});
                        }
                    };
                    
                    // Handle messages from main thread
                    self.onmessage = function(event) {
                        const {type, command} = event.data;
                        
                        if (type === 'command' && stockfish && isReady) {
                            stockfish.postMessage(command);
                        }
                    };
                    
                    // Initialize UCI
                    stockfish.postMessage('uci');
                    
                }).catch(error => {
                    console.error('Worker: Failed to load Stockfish WASM:', error);
                    self.postMessage({type: 'error', message: 'Failed to load Stockfish WASM: ' + error.message});
                });
            `;
            
            try {
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                
                this.worker = new Worker(workerUrl);
                
                this.worker.onmessage = (event) => {
                    const {type, message} = event.data;
                    
                    if (type === 'ready') {
                        this.ready = true;
                        console.log('✅ REAL Stockfish WASM is ready!');
                        resolve();
                    } else if (type === 'error') {
                        reject(new Error(message));
                    } else if (type === 'stockfish') {
                        this.handleStockfishMessage(message);
                    }
                };
                
                this.worker.onerror = (error) => {
                    reject(new Error('Worker error: ' + error.message));
                };
                
                // Set longer timeout for WASM loading
                setTimeout(() => {
                    if (!this.ready) {
                        reject(new Error('Stockfish WASM loading timeout'));
                    }
                }, 30000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    handleStockfishMessage(message) {
        console.log('📨 REAL Stockfish:', message);
        this.lastMessage = message;
    }

    async evaluate(fen, depth = 12) {
        if (!this.ready || !this.worker) {
            throw new Error('REAL Stockfish not ready');
        }

        return new Promise((resolve, reject) => {
            let bestEval = 0;
            let bestMove = '';
            let hasResolved = false;
            
            const originalHandler = this.worker.onmessage;
            
            this.worker.onmessage = (event) => {
                const {type, message} = event.data;
                
                if (type === 'stockfish') {
                    console.log('📊 Analysis:', message);
                    
                    // Parse evaluation from info messages (improved parsing)
                    if (message.includes('info') && message.includes('depth') && message.includes('score')) {
                        const depthMatch = message.match(/depth (\\d+)/);
                        const currentDepth = depthMatch ? parseInt(depthMatch[1]) : 0;
                        
                        if (currentDepth >= Math.min(depth, 8)) {
                            if (message.includes('score cp')) {
                                const cpMatch = message.match(/score cp (-?\\d+)/);
                                if (cpMatch) {
                                    bestEval = parseInt(cpMatch[1]) / 100;
                                }
                            } else if (message.includes('score mate')) {
                                const mateMatch = message.match(/score mate (-?\\d+)/);
                                if (mateMatch) {
                                    const mateIn = parseInt(mateMatch[1]);
                                    bestEval = mateIn > 0 ? 15 : -15;
                                }
                            }
                            
                            // Get the first move from pv (principal variation)
                            const pvMatch = message.match(/pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
                            if (pvMatch) {
                                bestMove = pvMatch[1];
                            }
                        }
                    }
                    
                    // End evaluation when we get bestmove
                    if (message.includes('bestmove') && !hasResolved) {
                        hasResolved = true;
                        this.worker.onmessage = originalHandler;
                        
                        const moveMatch = message.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
                        if (moveMatch && !bestMove) {
                            bestMove = moveMatch[1];
                        }
                        
                        resolve({
                            evaluation: bestEval,
                            bestMove: bestMove,
                            depth: depth
                        });
                    }
                }
            };
            
            // Set timeout
            setTimeout(() => {
                if (!hasResolved) {
                    hasResolved = true;
                    this.worker.onmessage = originalHandler;
                    reject(new Error('Stockfish evaluation timeout'));
                }
            }, 15000);
            
            try {
                // Send commands to REAL Stockfish WASM
                console.log('🔍 Sending to REAL Stockfish WASM:', fen);
                this.worker.postMessage({type: 'command', command: `position fen ${fen}`});
                this.worker.postMessage({type: 'command', command: `go depth ${depth}`});
            } catch (error) {
                if (!hasResolved) {
                    hasResolved = true;
                    this.worker.onmessage = originalHandler;
                    reject(error);
                }
            }
        });
    }

    stop() {
        if (this.worker) {
            try {
                this.worker.postMessage({type: 'command', command: 'stop'});
            } catch (error) {
                console.warn('⚠️ Error stopping Stockfish:', error);
            }
        }
    }

    quit() {
        if (this.worker) {
            try {
                this.worker.postMessage({type: 'command', command: 'quit'});
                this.worker.terminate();
            } catch (error) {
                console.warn('⚠️ Error quitting Stockfish:', error);
            }
        }
    }
}

// Make it available globally
window.RealStockfish = RealStockfish;
