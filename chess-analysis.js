// Chess Analysis System based on WintrCat/freechess
// This implements move classification and game analysis

class ChessAnalysis {
    constructor() {
        this.stockfish = new StockfishEngine();
        this.positions = [];
        this.reportResults = null;
        this.ongoingEvaluation = false;
    }

    // Classification types
    static Classification = {
        BRILLIANT: 'brilliant',
        GREAT: 'great',
        BEST: 'best',
        EXCELLENT: 'excellent',
        GOOD: 'good',
        INACCURACY: 'inaccuracy',
        MISTAKE: 'mistake',
        BLUNDER: 'blunder',
        BOOK: 'book',
        FORCED: 'forced'
    };

    // Classification values for accuracy calculation
    static classificationValues = {
        'brilliant': 5,
        'great': 4,
        'best': 3,
        'excellent': 3,
        'good': 2,
        'inaccuracy': 1,
        'mistake': 0,
        'blunder': 0,
        'book': 3,
        'forced': 3
    };

    // Parse PGN and create position array
    parsePGN(pgn) {
        const chess = new Chess();
        const positions = [];
        
        // Add starting position
        positions.push({ fen: chess.fen() });
        
        // Parse moves from PGN
        const moves = pgn.split(' ').filter(move => 
            move && !move.includes('.') && !move.includes('[') && !move.includes(']')
        );
        
        for (const move of moves) {
            try {
                const moveObj = chess.move(move);
                positions.push({
                    fen: chess.fen(),
                    move: {
                        san: move,
                        uci: moveObj.from + moveObj.to + (moveObj.promotion || '')
                    }
                });
            } catch (error) {
                console.error('Invalid move:', move, error);
                break;
            }
        }
        
        return positions;
    }

    // Evaluate positions with Stockfish
    async evaluatePositions(positions, depth = 15) {
        if (this.ongoingEvaluation) return;
        this.ongoingEvaluation = true;

        console.log(`Evaluating ${positions.length} positions at depth ${depth}...`);

        // Evaluate each position
        for (let i = 0; i < positions.length; i++) {
            const position = positions[i];
            
            if (position.move) {
                try {
                    const engineLines = await this.stockfish.evaluate(position.fen, depth);
                    position.topLines = engineLines;
                    position.worker = 'local';
                    
                    console.log(`Evaluated position ${i + 1}/${positions.length}`);
                } catch (error) {
                    console.error('Evaluation error:', error);
                    position.topLines = [];
                }
            }
        }

        this.ongoingEvaluation = false;
        return positions;
    }

    // Analyze positions and classify moves
    async analyze(positions) {
        console.log('Analyzing positions...');
        
        // Generate classifications for each position
        let positionIndex = 0;
        for (let position of positions.slice(1)) {
            positionIndex++;

            const board = new Chess(position.fen);
            const lastPosition = positions[positionIndex - 1];

            const topMove = lastPosition.topLines?.find(line => line.id == 1);
            const secondTopMove = lastPosition.topLines?.find(line => line.id == 2);
            
            if (!topMove) continue;

            const previousEvaluation = topMove.evaluation;
            const evaluation = position.topLines?.find(line => line.id == 1)?.evaluation;
            
            if (!previousEvaluation) continue;

            const moveColour = position.fen.includes(" b ") ? "white" : "black";

            // If there are no legal moves in this position, game is in terminal state
            if (!evaluation) {
                const terminalEvaluation = { 
                    type: board.isCheckmate() ? "mate" : "cp", 
                    value: 0 
                };
                position.topLines = [{
                    id: 1,
                    depth: 0,
                    evaluation: terminalEvaluation,
                    moveUCI: ""
                }];
            }

            const absoluteEvaluation = evaluation.value * (moveColour == "white" ? 1 : -1);
            const previousAbsoluteEvaluation = previousEvaluation.value * (moveColour == "white" ? 1 : -1);
            const absoluteSecondEvaluation = (secondTopMove?.evaluation.value ?? 0) * (moveColour == "white" ? 1 : -1);

            // Calculate evaluation loss
            let evalLoss = Infinity;
            let cutoffEvalLoss = Infinity;
            let lastLineEvalLoss = Infinity;

            const matchingTopLine = lastPosition.topLines?.find(line => line.moveUCI == position.move.uci);
            if (matchingTopLine) {
                if (moveColour == "white") {
                    lastLineEvalLoss = previousEvaluation.value - matchingTopLine.evaluation.value;
                } else {
                    lastLineEvalLoss = matchingTopLine.evaluation.value - previousEvaluation.value;
                }
            }

            if (lastPosition.cutoffEvaluation) {
                if (moveColour == "white") {
                    cutoffEvalLoss = lastPosition.cutoffEvaluation.value - evaluation.value;
                } else {
                    cutoffEvalLoss = evaluation.value - lastPosition.cutoffEvaluation.value;
                }
            }

            if (moveColour == "white") {
                evalLoss = previousEvaluation.value - evaluation.value;
            } else {
                evalLoss = evaluation.value - previousEvaluation.value;
            }

            evalLoss = Math.min(evalLoss, cutoffEvalLoss, lastLineEvalLoss);

            // If this move was the only legal one, apply forced
            if (!secondTopMove) {
                position.classification = ChessAnalysis.Classification.FORCED;
                continue;
            }

            const noMate = previousEvaluation.type == "cp" && evaluation.type == "cp";

            // If it is the top line, disregard other detections and give best
            if (topMove.moveUCI == position.move.uci) {
                position.classification = ChessAnalysis.Classification.BEST;
            } else {
                // Classify based on evaluation loss
                if (noMate) {
                    if (evalLoss <= 50) {
                        position.classification = ChessAnalysis.Classification.BEST;
                    } else if (evalLoss <= 100) {
                        position.classification = ChessAnalysis.Classification.EXCELLENT;
                    } else if (evalLoss <= 200) {
                        position.classification = ChessAnalysis.Classification.GOOD;
                    } else if (evalLoss <= 300) {
                        position.classification = ChessAnalysis.Classification.INACCURACY;
                    } else if (evalLoss <= 500) {
                        position.classification = ChessAnalysis.Classification.MISTAKE;
                    } else {
                        position.classification = ChessAnalysis.Classification.BLUNDER;
                    }
                } else {
                    // Handle mate positions
                    if (previousEvaluation.type == "cp" && evaluation.type == "mate") {
                        if (absoluteEvaluation > 0) {
                            position.classification = ChessAnalysis.Classification.BEST;
                        } else if (absoluteEvaluation >= -2) {
                            position.classification = ChessAnalysis.Classification.BLUNDER;
                        } else if (absoluteEvaluation >= -5) {
                            position.classification = ChessAnalysis.Classification.MISTAKE;
                        } else {
                            position.classification = ChessAnalysis.Classification.INACCURACY;
                        }
                    } else if (previousEvaluation.type == "mate" && evaluation.type == "cp") {
                        if (previousAbsoluteEvaluation < 0 && absoluteEvaluation < 0) {
                            position.classification = ChessAnalysis.Classification.BEST;
                        } else if (absoluteEvaluation >= 400) {
                            position.classification = ChessAnalysis.Classification.GOOD;
                        } else if (absoluteEvaluation >= 150) {
                            position.classification = ChessAnalysis.Classification.INACCURACY;
                        } else if (absoluteEvaluation >= -100) {
                            position.classification = ChessAnalysis.Classification.MISTAKE;
                        } else {
                            position.classification = ChessAnalysis.Classification.BLUNDER;
                        }
                    } else {
                        position.classification = ChessAnalysis.Classification.BEST;
                    }
                }
            }

            // Check for brilliant moves
            if (position.classification == ChessAnalysis.Classification.BEST) {
                const winningAnyways = (
                    absoluteSecondEvaluation >= 700 && topMove.evaluation.type == "cp"
                    || (topMove.evaluation.type == "mate" && secondTopMove.evaluation.type == "mate")
                );

                if (absoluteEvaluation >= 0 && !winningAnyways && !position.move.san.includes("=")) {
                    // Simplified brilliancy check
                    if (Math.abs(evalLoss) > 200 && Math.random() < 0.1) {
                        position.classification = ChessAnalysis.Classification.BRILLIANT;
                    }
                }
            }

            // Check for great moves
            if (position.classification == ChessAnalysis.Classification.BEST) {
                try {
                    if (
                        noMate
                        && position.classification != ChessAnalysis.Classification.BRILLIANT
                        && lastPosition.classification == ChessAnalysis.Classification.BLUNDER
                        && Math.abs(topMove.evaluation.value - secondTopMove.evaluation.value) >= 150
                    ) {
                        position.classification = ChessAnalysis.Classification.GREAT;
                    }
                } catch {}
            }

            // Do not allow blunder if move still completely winning
            if (position.classification == ChessAnalysis.Classification.BLUNDER && absoluteEvaluation >= 600) {
                position.classification = ChessAnalysis.Classification.GOOD;
            }

            // Do not allow blunder if you were already in a completely lost position
            if (
                position.classification == ChessAnalysis.Classification.BLUNDER 
                && previousAbsoluteEvaluation <= -600
                && previousEvaluation.type == "cp"
                && evaluation.type == "cp"
            ) {
                position.classification = ChessAnalysis.Classification.GOOD;
            }

            position.classification ??= ChessAnalysis.Classification.BOOK;
        }

        // Calculate accuracies
        const accuracies = {
            white: { current: 0, maximum: 0 },
            black: { current: 0, maximum: 0 }
        };

        const classifications = {
            white: {
                brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
                inaccuracy: 0, mistake: 0, blunder: 0, book: 0, forced: 0
            },
            black: {
                brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
                inaccuracy: 0, mistake: 0, blunder: 0, book: 0, forced: 0
            }
        };

        for (let position of positions.slice(1)) {
            const moveColour = position.fen.includes(" b ") ? "white" : "black";

            accuracies[moveColour].current += ChessAnalysis.classificationValues[position.classification];
            accuracies[moveColour].maximum++;

            classifications[moveColour][position.classification]++;
        }

        // Return complete report
        this.reportResults = {
            accuracies: {
                white: accuracies.white.maximum > 0 ? accuracies.white.current / accuracies.white.maximum * 100 : 100,
                black: accuracies.black.maximum > 0 ? accuracies.black.current / accuracies.black.maximum * 100 : 100
            },
            classifications,
            positions: positions
        };

        return this.reportResults;
    }

    // Main analysis function
    async analyzeGame(pgn, depth = 15) {
        console.log('Starting game analysis...');
        
        // Parse PGN
        const positions = this.parsePGN(pgn);
        console.log(`Parsed ${positions.length} positions`);
        
        // Evaluate positions
        const evaluatedPositions = await this.evaluatePositions(positions, depth);
        console.log('Position evaluation complete');
        
        // Analyze and classify moves
        const report = await this.analyze(evaluatedPositions);
        console.log('Analysis complete');
        
        return report;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessAnalysis;
} else {
    window.ChessAnalysis = ChessAnalysis;
}
