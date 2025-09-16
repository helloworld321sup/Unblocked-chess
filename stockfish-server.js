const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

let stockfish = null;

function startStockfish() {
    const stockfishPath = path.join(__dirname, 'Stockfish', 'src', 'stockfish');
    stockfish = spawn(stockfishPath);
    
    stockfish.stdin.write('uci\n');
    stockfish.stdin.write('setoption name MultiPV value 2\n');
    stockfish.stdin.write('isready\n');
    
    return stockfish;
}

app.post('/analyze', (req, res) => {
    const { fen, depth = 15 } = req.body;
    
    if (!stockfish) {
        startStockfish();
    }
    
    let output = '';
    let evaluation = 0;
    
    const onData = (data) => {
        output += data.toString();
        
        if (output.includes('bestmove')) {
            const lines = output.split('\n');
            for (const line of lines) {
                if (line.includes('cp ')) {
                    const match = line.match(/cp ([-\d]+)/);
                    if (match) {
                        evaluation = parseInt(match[1]) / 100;
                        if (fen.includes(' b ')) evaluation *= -1;
                    }
                }
            }
            
            stockfish.stdout.removeListener('data', onData);
            res.json({ evaluation, output });
        }
    };
    
    stockfish.stdout.on('data', onData);
    stockfish.stdin.write(`position fen ${fen}\n`);
    stockfish.stdin.write(`go depth ${depth}\n`);
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Stockfish server running on http://localhost:${PORT}`);
    startStockfish();
});
