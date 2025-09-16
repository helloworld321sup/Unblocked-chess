// Simple Stockfish Integration - The Way That Actually Works
// Based on proven examples from working chess websites

class SimpleStockfish {
    constructor() {
        this.engine = null;
        this.ready = false;
        this.init();
    }

    async init() {
        console.log('Loading Stockfish...');
        
        // Use the approach that actually works - direct script loading
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/lichess-org/stockfish.js@8.0.0/stockfish.js';
        
        script.onload = () => {
            console.log('Stockfish script loaded');
            setTimeout(() => {
                if (typeof Stockfish !== 'undefined') {
                    this.engine = Stockfish();
                    this.setupEngine();
                } else {
                    console.error('Stockfish not found after loading');
                }
            }, 1000);
        };
        
        script.onerror = () => {
            console.error('Failed to load Stockfish');
        };
        
        document.head.appendChild(script);
    }

    setupEngine() {
        this.engine.onmessage = (event) => {
            const message = event.data;
            console.log('Stockfish:', message);
            
            if (message.includes('uciok')) {
                this.ready = true;
                console.log('Stockfish ready!');
            }
        };
        
        this.engine.postMessage('uci');
    }

    async evaluate(fen, depth = 10) {
        if (!this.ready || !this.engine) {
            throw new Error('Stockfish not ready');
        }

        return new Promise((resolve) => {
            let bestEval = 0;
            let bestMove = '';
            
            const originalHandler = this.engine.onmessage;
            
            this.engine.onmessage = (event) => {
                const message = event.data;
                
                if (message.includes('info') && message.includes('score cp')) {
                    const match = message.match(/score cp (-?\d+)/);
                    if (match) {
                        bestEval = parseInt(match[1]) / 100;
                    }
                }
                
                if (message.includes('bestmove')) {
                    const match = message.match(/bestmove (\w+)/);
                    if (match) {
                        bestMove = match[1];
                    }
                    
                    this.engine.onmessage = originalHandler;
                    resolve({
                        evaluation: bestEval,
                        bestMove: bestMove,
                        depth: depth
                    });
                }
            };
            
            this.engine.postMessage(`position fen ${fen}`);
            this.engine.postMessage(`go depth ${depth}`);
        });
    }
}

// Make it available globally
window.SimpleStockfish = SimpleStockfish;
