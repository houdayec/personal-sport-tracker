#!/bin/bash

# Generate project structure while excluding specific directories
tree --noreport -I "node_modules|dist|.git" | sed 's/│/|/g; s/─/-/g; s/└/|-/g; s/├/|-/g' > project_structure.txt

echo "Project structure saved to project_structure.txt"
