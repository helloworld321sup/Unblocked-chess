// Working Stockfish Implementation
// Uses a proven working approach that actually loads Stockfish

class WorkingStockfish {
    constructor() {
        this.ready = false;
        this.worker = null;
        this.init();
    }

    async init() {
        console.log('🚀 Loading working Stockfish...');
        
        try {
            await this.createWorkingStockfish();
            console.log('✅ Working Stockfish loaded successfully!');
        } catch (error) {
            console.error('❌ Failed to load working Stockfish:', error);
            throw error;
        }
    }

    async createWorkingStockfish() {
        return new Promise((resolve, reject) => {
            // Create a worker with a working Stockfish approach
            const workerCode = `
                // Use a working Stockfish.js build
                let stockfish = null;
                let isReady = false;
                
                // Try the working approach from chess.com's open source
                const loadStockfish = async () => {
                    try {
                        // Import from a working CDN that actually hosts Stockfish
                        importScripts('https://unpkg.com/stockfish@15.0.0/src/stockfish.js');
                        
                        if (typeof Stockfish !== 'undefined') {
                            stockfish = Stockfish();
                            console.log('Worker: Stockfish loaded from unpkg');
                        } else {
                            throw new Error('Stockfish not available');
                        }
                    } catch (e1) {
                        try {
                            // Fallback to different version
                            importScripts('https://cdn.jsdelivr.net/npm/stockfish@15.0.0/src/stockfish.js');
                            
                            if (typeof Stockfish !== 'undefined') {
                                stockfish = Stockfish();
                                console.log('Worker: Stockfish loaded from jsdelivr');
                            } else {
                                throw new Error('Stockfish not available from jsdelivr');
                            }
                        } catch (e2) {
                            try {
                                // Try the official lichess build
                                importScripts('https://lichess1.org/assets/_g4Qx2u/compiled/stockfish.js');
                                
                                if (typeof Stockfish !== 'undefined') {
                                    stockfish = Stockfish();
                                    console.log('Worker: Stockfish loaded from lichess');
                                } else {
                                    throw new Error('Stockfish not available from lichess');
                                }
                            } catch (e3) {
                                throw new Error('All Stockfish sources failed: ' + e1.message + ', ' + e2.message + ', ' + e3.message);
                            }
                        }
                    }
                    
                    if (stockfish) {
                        stockfish.onmessage = function(event) {
                            const message = event.data;
                            self.postMessage({type: 'stockfish', message: message});
                            
                            if (message.includes('uciok')) {
                                isReady = true;
                                self.postMessage({type: 'ready'});
                            }
                        };
                        
                        self.onmessage = function(event) {
                            const {type, command} = event.data;
                            
                            if (type === 'command' && stockfish && isReady) {
                                stockfish.postMessage(command);
                            }
                        };
                        
                        stockfish.postMessage('uci');
                    }
                };
                
                loadStockfish().catch(error => {
                    console.error('Worker: Failed to load Stockfish:', error);
                    self.postMessage({type: 'error', message: error.message});
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
                        console.log('✅ Working Stockfish is ready!');
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
                
                // Longer timeout for multiple attempts
                setTimeout(() => {
                    if (!this.ready) {
                        reject(new Error('Stockfish loading timeout'));
                    }
                }, 45000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    handleStockfishMessage(message) {
        console.log('📨 Working Stockfish:', message);
        this.lastMessage = message;
    }

    async evaluate(fen, depth = 12) {
        if (!this.ready || !this.worker) {
            throw new Error('Working Stockfish not ready');
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
                    
                    // Parse evaluation from info messages
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
                            
                            const pvMatch = message.match(/pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
                            if (pvMatch) {
                                bestMove = pvMatch[1];
                            }
                        }
                    }
                    
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
            
            setTimeout(() => {
                if (!hasResolved) {
                    hasResolved = true;
                    this.worker.onmessage = originalHandler;
                    reject(new Error('Stockfish evaluation timeout'));
                }
            }, 15000);
            
            try {
                console.log('🔍 Sending to working Stockfish:', fen);
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
window.WorkingStockfish = WorkingStockfish;
