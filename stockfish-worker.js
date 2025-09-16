// REAL Stockfish Integration - No More Fallbacks!
// This will use actual Stockfish or fail trying

class StockfishEngine {
    constructor() {
        this.stockfish = null;
        this.isReady = false;
        this.useStockfish = false;
        this.init();
    }

    async init() {
        console.log('🚀 Loading REAL Stockfish engine...');
        
        try {
            await this.loadRealStockfish();
            console.log('✅ REAL Stockfish loaded successfully!');
            this.isReady = true;
            this.useStockfish = true;
        } catch (error) {
            console.error('❌ FAILED to load Stockfish:', error.message);
            console.error('🔥 NO FALLBACK - STOCKFISH OR NOTHING!');
            throw new Error('Stockfish is required!');
        }
    }

    async loadRealStockfish() {
        return new Promise((resolve, reject) => {
            console.log('📥 Attempting to load Stockfish from working sources...');
            
            // Try the most reliable approach - create Web Worker with Stockfish
            const workerCode = `
                // Import Stockfish directly
                let stockfish = null;
                let isReady = false;
                
                // Try to import Stockfish from multiple sources
                const sources = [
                    'https://cdn.jsdelivr.net/gh/nmrugg/stockfish.js@10.0.2/stockfish.js',
                    'https://unpkg.com/stockfish.js@10.0.2/stockfish.js',
                    'https://raw.githubusercontent.com/nmrugg/stockfish.js/master/stockfish.js'
                ];
                
                async function loadStockfish() {
                    for (const src of sources) {
                        try {
                            console.log('Worker trying:', src);
                            importScripts(src);
                            
                            if (typeof Stockfish !== 'undefined') {
                                stockfish = new Stockfish();
                                console.log('Stockfish loaded in worker!');
                                break;
                            } else if (typeof STOCKFISH !== 'undefined') {
                                stockfish = STOCKFISH();
                                console.log('STOCKFISH loaded in worker!');
                                break;
                            }
                        } catch (e) {
                            console.warn('Worker failed to load from', src, ':', e.message);
                            continue;
                        }
                    }
                    
                    if (!stockfish) {
                        throw new Error('No Stockfish source worked in worker');
                    }
                    
                    stockfish.onmessage = function(event) {
                        const message = event.data;
                        if (message.includes('uciok')) {
                            isReady = true;
                            self.postMessage({type: 'ready'});
                        } else {
                            self.postMessage({type: 'message', data: message});
                        }
                    };
                    
                    stockfish.postMessage('uci');
                }
                
                self.onmessage = function(event) {
                    const {type, command} = event.data;
                    
                    if (type === 'init') {
                        loadStockfish().catch(error => {
                            self.postMessage({type: 'error', error: error.message});
                        });
                    } else if (type === 'command' && stockfish && isReady) {
                        stockfish.postMessage(command);
                    }
                };
            `;
            
            try {
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                this.stockfish = new Worker(workerUrl);
                
                this.stockfish.onmessage = (event) => {
                    const { type, data, error } = event.data;
                    
                    if (type === 'ready') {
                        console.log('✅ Stockfish Web Worker is ready!');
                        resolve();
                    } else if (type === 'error') {
                        reject(new Error(error));
                    } else if (type === 'message') {
                        this.handleStockfishMessage(data);
                    }
                };
                
                this.stockfish.onerror = (error) => {
                    reject(new Error('Web Worker error: ' + error.message));
                };
                
                // Initialize the worker
                this.stockfish.postMessage({ type: 'init' });
                
                // Set timeout
                setTimeout(() => {
                    reject(new Error('Stockfish loading timeout'));
                }, 30000);
                
            } catch (error) {
                reject(new Error('Failed to create Stockfish worker: ' + error.message));
            }
        });
    }

    handleStockfishMessage(message) {
        // Store the latest message for evaluation callbacks
        this.latestMessage = message;
        console.log('📨 Stockfish:', message);
    }

    async evaluate(fen, depth = 15) {
        if (!this.useStockfish || !this.stockfish) {
            throw new Error('Stockfish not available!');
        }

        return new Promise((resolve, reject) => {
            let bestEvaluation = 0;
            let bestMove = '';
            let hasResolved = false;
            
            // Set up message handler for this evaluation
            const originalHandler = this.stockfish.onmessage;
            
            this.stockfish.onmessage = (event) => {
                const { type, data } = event.data;
                
                if (type === 'message') {
                    const message = data;
                    console.log('📊 Analysis:', message);
                    
                    // Parse evaluation from info messages
                    if (message.includes('info') && message.includes('depth') && message.includes('score')) {
                        const depthMatch = message.match(/depth (\\d+)/);
                        const currentDepth = depthMatch ? parseInt(depthMatch[1]) : 0;
                        
                        if (currentDepth >= Math.min(depth, 12)) {
                            if (message.includes('score cp')) {
                                const cpMatch = message.match(/score cp (-?\\d+)/);
                                if (cpMatch) {
                                    bestEvaluation = parseInt(cpMatch[1]) / 100;
                                }
                            } else if (message.includes('score mate')) {
                                const mateMatch = message.match(/score mate (-?\\d+)/);
                                if (mateMatch) {
                                    const mateIn = parseInt(mateMatch[1]);
                                    bestEvaluation = mateIn > 0 ? 15 : -15;
                                }
                            }
                            
                            const pvMatch = message.match(/pv (\\w+)/);
                            if (pvMatch) {
                                bestMove = pvMatch[1];
                            }
                        }
                    }
                    
                    // End evaluation when we get bestmove
                    if (message.includes('bestmove') && !hasResolved) {
                        hasResolved = true;
                        this.stockfish.onmessage = originalHandler;
                        
                        const moveMatch = message.match(/bestmove (\\w+)/);
                        if (moveMatch && !bestMove) {
                            bestMove = moveMatch[1];
                        }
                        
                        resolve({
                            evaluation: bestEvaluation,
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
                    this.stockfish.onmessage = originalHandler;
                    reject(new Error('Stockfish evaluation timeout'));
                }
            }, 10000);
            
            try {
                // Send commands to Stockfish
                console.log('🔍 Sending position to Stockfish:', fen);
                this.stockfish.postMessage({ type: 'command', command: `position fen ${fen}` });
                this.stockfish.postMessage({ type: 'command', command: `go depth ${depth}` });
            } catch (error) {
                if (!hasResolved) {
                    hasResolved = true;
                    this.stockfish.onmessage = originalHandler;
                    reject(error);
                }
            }
        });
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
                this.stockfish.postMessage({ type: 'command', command: 'stop' });
            } catch (error) {
                console.warn('⚠️ Error stopping Stockfish:', error);
            }
        }
    }

    quit() {
        if (this.stockfish) {
            try {
                this.stockfish.postMessage({ type: 'command', command: 'quit' });
                this.stockfish.terminate();
            } catch (error) {
                console.warn('⚠️ Error quitting Stockfish:', error);
            }
        }
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.StockfishEngine = StockfishEngine;
}
