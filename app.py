from flask import Flask, render_template, jsonify, request
import random
import time
import json
import os

app = Flask(__name__)

# Load high scores function
def load_high_scores():
    if os.path.exists('high_scores.json'):
        with open('high_scores.json', 'r') as f:
            return json.load(f)
    return []

# Save high scores function
def save_high_scores(scores):
    with open('high_scores.json', 'w') as f:
        json.dump(scores, f)

# Check if score is a high score
def is_high_score(score):
    scores = load_high_scores()
    if len(scores) < 10:
        return True
    return score > min(s['score'] for s in scores)

# Add new high score
def add_high_score(name, score):
    scores = load_high_scores()
    scores.append({'name': name, 'score': score})
    # Sort by score in descending order
    scores.sort(key=lambda x: x['score'], reverse=True)
    # Keep only top 10
    scores = scores[:10]
    save_high_scores(scores)
    return scores

# Tetris pieces with their shapes and types
SHAPES = [
    ([[1, 1, 1, 1]], "I"),  # I
    ([[1, 1], [1, 1]], "O"),  # O
    ([[1, 1, 1], [0, 1, 0]], "T"),  # T
    ([[1, 1, 1], [1, 0, 0]], "L"),  # L
    ([[1, 1, 1], [0, 0, 1]], "J"),  # J
    ([[1, 1, 0], [0, 1, 1]], "S"),  # S
    ([[0, 1, 1], [1, 1, 0]], "Z")   # Z
]

class TetrisGame:
    def __init__(self):
        self.width = 10
        self.height = 20
        self.board = [[0 for _ in range(self.width)] for _ in range(self.height)]
        self.current_piece = None
        self.current_piece_type = None
        self.current_pos = None
        self.game_over = False
        self.is_paused = False
        self.score = 0
        self.level = 1
        self.lines_cleared = 0
        self.lines_to_next_level = 10
        self.next_pieces = []
        self.generate_next_pieces()
        self.new_piece()

    def generate_next_pieces(self):
        # Generate 3 new pieces at once
        new_pieces = []
        for _ in range(3):
            shape, piece_type = random.choice(SHAPES)
            new_pieces.append((shape, piece_type))
        self.next_pieces.extend(new_pieces)

    def new_piece(self):
        if not self.next_pieces:
            self.generate_next_pieces()
        shape, piece_type = self.next_pieces.pop(0)
        self.current_piece = shape
        self.current_piece_type = piece_type
        # Start at the top of the board
        self.current_pos = [0, self.width // 2 - len(shape[0]) // 2]
        
        # Check if the new piece collides with existing pieces
        if self.check_collision():
            self.game_over = True
            return False
        return True

    def check_collision(self):
        for y, row in enumerate(self.current_piece):
            for x, cell in enumerate(row):
                if cell:
                    board_y = self.current_pos[0] + y
                    board_x = self.current_pos[1] + x
                    if (board_y >= self.height or 
                        board_x < 0 or 
                        board_x >= self.width or 
                        (board_y >= 0 and self.board[board_y][board_x])):
                        return True
        return False

    def rotate_piece(self):
        if self.is_paused:
            return
        # Transpose and reverse rows to rotate 90 degrees clockwise
        rotated = list(zip(*self.current_piece[::-1]))
        old_piece = self.current_piece
        self.current_piece = rotated
        if self.check_collision():
            self.current_piece = old_piece

    def move_piece(self, dx, dy):
        if self.is_paused:
            return True
        self.current_pos[0] += dy
        self.current_pos[1] += dx
        if self.check_collision():
            self.current_pos[0] -= dy
            self.current_pos[1] -= dx
            if dy > 0:  # If we hit something while moving down
                self.lock_piece()
                self.clear_lines()
                if not self.new_piece():
                    return False
            return False
        return True

    def lock_piece(self):
        for y, row in enumerate(self.current_piece):
            for x, cell in enumerate(row):
                if cell:
                    board_y = self.current_pos[0] + y
                    board_x = self.current_pos[1] + x
                    if 0 <= board_y < self.height and 0 <= board_x < self.width:
                        self.board[board_y][board_x] = (1, self.current_piece_type)

    def clear_lines(self):
        lines_to_clear = []
        y = self.height - 1
        while y >= 0:
            if all(cell != 0 for cell in self.board[y]):
                lines_to_clear.append(y)
            y -= 1
        
        if lines_to_clear:
            # Mark lines to be cleared
            for y in lines_to_clear:
                for x in range(self.width):
                    if isinstance(self.board[y][x], tuple):
                        self.board[y][x] = (3, self.board[y][x][1])  # 3 indicates flashing line
            return lines_to_clear
        return []

    def remove_marked_lines(self):
        y = self.height - 1
        while y >= 0:
            if any(isinstance(cell, tuple) and cell[0] == 3 for cell in self.board[y]):
                del self.board[y]
                self.board.insert(0, [0 for _ in range(self.width)])
                # Update score and level
                base_points = 100
                level_multiplier = self.level
                self.score += base_points * level_multiplier
                self.lines_cleared += 1
                if self.lines_cleared >= self.lines_to_next_level:
                    self.level_up()
            else:
                y -= 1

    def level_up(self):
        self.level += 1
        self.lines_to_next_level += 10  # Next level after 10 more lines

    def get_state(self):
        board = [row[:] for row in self.board]
        if not self.game_over and not self.is_paused:
            for y, row in enumerate(self.current_piece):
                for x, cell in enumerate(row):
                    if cell:
                        board_y = self.current_pos[0] + y
                        board_x = self.current_pos[1] + x
                        if 0 <= board_y < self.height and 0 <= board_x < self.width:
                            board[board_y][board_x] = (2, self.current_piece_type)
        return {
            'board': board,
            'score': self.score,
            'level': self.level,
            'lines_cleared': self.lines_cleared,
            'lines_to_next_level': self.lines_to_next_level,
            'game_over': self.game_over,
            'is_paused': self.is_paused,
            'next_pieces': self.next_pieces  # Send all next pieces, not just the first one
        }

game = TetrisGame()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/reset')
def reset():
    global game
    game = TetrisGame()
    return jsonify(game.get_state())

@app.route('/move', methods=['POST'])
def move():
    direction = request.json.get('direction')
    if direction == 'left':
        game.move_piece(-1, 0)
    elif direction == 'right':
        game.move_piece(1, 0)
    elif direction == 'down':
        game.move_piece(0, 1)
    elif direction == 'rotate':
        game.rotate_piece()
    return jsonify(game.get_state())

@app.route('/move_down', methods=['POST'])
def move_down():
    if not game.is_paused:
        game.move_piece(0, 1)
        # Check for lines to clear
        lines_to_clear = game.clear_lines()
        if lines_to_clear:
            # Return the state with flashing lines
            return jsonify(game.get_state())
        # If no lines were cleared, remove any previously marked lines
        game.remove_marked_lines()
    return jsonify(game.get_state())

@app.route('/remove_lines', methods=['POST'])
def remove_lines():
    game.remove_marked_lines()
    return jsonify(game.get_state())

@app.route('/pause', methods=['POST'])
def pause():
    game.is_paused = not game.is_paused
    return jsonify(game.get_state())

@app.route('/state')
def get_state():
    return jsonify(game.get_state())

@app.route('/submit_score', methods=['POST'])
def submit_score():
    data = request.json
    name = data.get('name', 'Anonymous')
    score = data.get('score', 0)
    if is_high_score(score):
        high_scores = add_high_score(name, score)
        return jsonify({'high_scores': high_scores, 'is_high_score': True})
    return jsonify({'is_high_score': False})

@app.route('/get_high_scores')
def get_high_scores():
    return jsonify({'high_scores': load_high_scores()})

if __name__ == '__main__':
    app.run(debug=True) 