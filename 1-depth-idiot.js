// ChessBot.java
import java.util.ArrayList;
import java.util.List;

public class ChessBot {

    // Simplified Board representation (for demonstration)
    // 'p' for pawn, 'r' for rook, 'n' for knight, 'b' for bishop, 'q' for queen, 'k' for king
    // Uppercase for White, Lowercase for Black
    // '_' for empty square
    private char[][] board;

    public ChessBot() {
        // Initialize a standard starting board
        board = new char[][]{
                {'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'},
                {'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'},
                {'_', '_', '_', '_', '_', '_', '_', '_'},
                {'_', '_', '_', '_', '_', '_', '_', '_'},
                {'_', '_', '_', '_', '_', '_', '_', '_'},
                {'_', '_', '_', '_', '_', '_', '_', '_'},
                {'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'},
                {'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'}
        };
    }

    public String findBestMove(boolean isWhiteTurn) {
        int bestScore = isWhiteTurn ? Integer.MIN_VALUE : Integer.MAX_VALUE;
        String bestMove = null;

        // In a real bot, you'd generate all legal moves.
        // For this depth 1 example, we'll just simulate a few simple moves.
        // This is a highly simplified example and does not represent a full move generation.
        List<String> possibleMoves = generateSimpleMoves(isWhiteTurn);

        for (String move : possibleMoves) {
            char[][] tempBoard = deepCopyBoard(board);
            // Apply the move to tempBoard (simplified for this example)
            // e.g., "e2e4" -> move pawn from e2 to e4
            applySimplifiedMove(tempBoard, move);

            int score = evaluateBoard(tempBoard, isWhiteTurn);

            if (isWhiteTurn) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }
        return bestMove;
    }

    private List<String> generateSimpleMoves(boolean isWhiteTurn) {
        List<String> moves = new ArrayList<>();
        // This is a placeholder. A real bot needs a comprehensive move generator.
        // For depth 1, we'll just add a few dummy moves for demonstration.
        if (isWhiteTurn) {
            moves.add("e2e4"); // Example White pawn move
            moves.add("g1f3"); // Example White knight move
        } else {
            moves.add("e7e5"); // Example Black pawn move
            moves.add("g8f6"); // Example Black knight move
        }
        return moves;
    }

    private void applySimplifiedMove(char[][] tempBoard, String move) {
        // This is a very basic move application for demonstration.
        // A real chess engine requires detailed move parsing and application.
        // Example: "e2e4"
        int startRank = 8 - (move.charAt(1) - '0');
        int startFile = move.charAt(0) - 'a';
        int endRank = 8 - (move.charAt(3) - '0');
        int endFile = move.charAt(2) - 'a';

        tempBoard[endRank][endFile] = tempBoard[startRank][startFile];
        tempBoard[startRank][startFile] = '_';
    }

    private int evaluateBoard(char[][] currentBoard, boolean isWhiteTurn) {
        int score = 0;
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                char piece = currentBoard[r][c];
                switch (piece) {
                    case 'P': score += 10; break;
                    case 'N': score += 30; break;
                    case 'B': score += 30; break;
                    case 'R': score += 50; break;
                    case 'Q': score += 90; break;
                    case 'K': score += 900; break;
                    case 'p': score -= 10; break;
                    case 'n': score -= 30; break;
                    case 'b': score -= 30; break;
                    case 'r': score -= 50; break;
                    case 'q': score -= 90; break;
                    case 'k': score -= 900; break;
                }
            }
        }
        return score;
    }

    private char[][] deepCopyBoard(char[][] original) {
        char[][] copy = new char[original.length][];
        for (int i = 0; i < original.length; i++) {
            copy[i] = original[i].clone();
        }
        return copy;
    }
}
