#!/usr/bin/env python3
"""
High Score Reset Script for Tetris Game
This script resets the high scores by clearing the high_scores.json file.
"""

import json
import os

def reset_high_scores():
    """
    Resets the high scores by clearing the high_scores.json file.
    Creates an empty array in the file.
    """
    high_scores_file = 'high_scores.json'
    
    try:
        # Create an empty high scores array
        empty_scores = []
        
        # Write the empty array to the file
        with open(high_scores_file, 'w') as f:
            json.dump(empty_scores, f, indent=2)
        
        print(f"✅ High scores have been reset successfully!")
        print(f"📁 File: {high_scores_file}")
        print(f"📊 High scores cleared: Ready for new records!")
        
    except FileNotFoundError:
        print(f"⚠️  High scores file '{high_scores_file}' not found.")
        print("Creating a new empty high scores file...")
        
        # Create the file with empty array
        with open(high_scores_file, 'w') as f:
            json.dump([], f, indent=2)
        
        print(f"✅ New high scores file created: {high_scores_file}")
        
    except Exception as e:
        print(f"❌ Error resetting high scores: {e}")
        return False
    
    return True

def main():
    """
    Main function to run the high score reset script.
    """
    print("🎮 Tetris High Score Reset Script")
    print("=" * 40)
    
    # Ask for confirmation
    response = input("Are you sure you want to reset all high scores? (y/N): ").strip().lower()
    
    if response in ['y', 'yes']:
        success = reset_high_scores()
        if success:
            print("\n🎯 High scores have been successfully reset!")
            print("   Players can now compete for new high scores!")
        else:
            print("\n❌ Failed to reset high scores. Please check the error above.")
    else:
        print("\n🔄 High score reset cancelled.")
        print("   High scores remain unchanged.")

if __name__ == "__main__":
    main() 