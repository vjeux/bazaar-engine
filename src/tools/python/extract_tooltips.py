#!/usr/bin/env python3

import json
import os


def extract_unified_tooltips():
    # Path to the apiItems.json file
    file_path = os.path.join(os.getcwd(), "src", "json", "apiItems.json")

    # Set to store unique tooltip strings
    unique_tooltips = set()

    # Load and parse the JSON file
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        # Extract tooltips from each item
        for item in data.get("data", []):
            if "unifiedTooltips" in item:
                for tooltip in item["unifiedTooltips"]:
                    unique_tooltips.add(tooltip)

        # Sort the unique tooltips alphabetically
        sorted_tooltips = sorted(list(unique_tooltips))

        # Write the unique tooltips to a file
        output_path = os.path.join(os.getcwd(), "src", "python", "unified_tooltips.txt")
        with open(output_path, "w", encoding="utf-8") as output_file:
            for tooltip in sorted_tooltips:
                output_file.write(f"{tooltip}\n")

        print(f"Found {len(unique_tooltips)} unique unified tooltips.")
        print(f"Results have been saved to {output_path}")

    except FileNotFoundError:
        print(f"Error: Could not find the file {file_path}")
    except json.JSONDecodeError:
        print(f"Error: The file {file_path} is not a valid JSON file")
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    extract_unified_tooltips()
