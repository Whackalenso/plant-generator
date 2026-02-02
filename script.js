// Grid dimensions
const GRID_SIZE = 50;
const PIXEL_SIZE = 10; // Each pixel will be 5x5 screen pixels for visibility
const MIN_DICTANCE_FROM_EDGE = 5; // Minimum distance from edge to allow growth

// 2D array to store pixel colors
let pixelGrid = [];

// Convert angle in degrees to grid direction
function angleToDirection(angle) {
    // Normalize angle to 0-360
    angle = ((angle % 360) + 360) % 360;
    
    // Convert to radians
    const radians = (angle * Math.PI) / 180;
    
    // Calculate direction vector
    return {
        x: Math.round(Math.cos(radians)),
        y: Math.round(-Math.sin(radians)) // Negative because y increases downward
    };
}

// Get growth probabilities based on angle
function getGrowthProbabilities(angle) {
    // Normalize angle to 0-360
    angle = ((angle % 360) + 360) % 360;
    
    // Determine which quadrants the angle falls into
    const probabilities = {
        0: {
            up: 0.25,
            down: 0.25,
            left: 0.0,
            right: 0.50
        },
        90: {
            up: 0.50,
            down: 0.0,
            left: 0.25,
            right: 0.25
        },
        180: {
            up: 0.25,
            down: 0.25,
            left: 0.50,
            right: 0.0
        },
        270: {
            up: 0.0,
            down: 0.50,
            left: 0.25,
            right: 0.25
        },
        45: {
            up: 0.50,
            down: 0.0,
            left: 0.0,
            right: 0.50
        },
        135: {
            up: 0.50,
            down: 0.0,
            left: 0.50,
            right: 0.0
        },
        225: {
            up: 0.0,
            down: 0.50,
            left: 0.50,
            right: 0.0
        },
        315: {
            up: 0.0,
            down: 0.50,
            left: 0.0,
            right: 0.50
        }
    }
    
    return probabilities[angle];
}

// Choose a direction based on probabilities
function chooseDirection(probabilities) {
    const rand = Math.random();
    let cumulative = 0;
    
    const directions = ['up', 'right', 'down', 'left'];
    for (const dir of directions) {
        cumulative += probabilities[dir];
        if (rand <= cumulative) {
            return dir;
        }
    }
    
    return 'up'; // Fallback
}

// Tree node class
class TreeNode {
    constructor(x, y, angle = 90, parent = null) {
        this.x = x;
        this.y = y;
        this.angle = angle; // Angle in degrees (90 = up, 0 = right, 180 = left, 270 = down)
        this.parent = parent;
        this.children = [];
        this.color = color(0, 255, 0); // Default green color
    }
    
    grow() {
        // Check if current position is too close to edge in growth direction
        if (isTooCloseToEdge(this.x, this.y, this.angle)) {
            // Start a flower at this position if not already stopped
            if (!this.isStopped) {
                this.isStopped = true;
                createFlowerAtPosition(this.x, this.y);
            }
            return null;
        }
        
        const probabilities = getGrowthProbabilities(this.angle);
        
        // Try to find a valid direction (up to 10 attempts)
        for (let attempt = 0; attempt < 10; attempt++) {
            const chosenDirection = chooseDirection(probabilities);
            
            // Map chosen direction to movement vector
            let dir;
            switch(chosenDirection) {
                case 'up': dir = { x: 0, y: -1 }; break;
                case 'right': dir = { x: 1, y: 0 }; break;
                case 'down': dir = { x: 0, y: 1 }; break;
                case 'left': dir = { x: -1, y: 0 }; break;
            }
            
            const newX = this.x + dir.x;
            const newY = this.y + dir.y;
            
            // Check bounds and if position is empty
            if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE && 
                !isPositionOccupied(newX, newY)) {
                // Child inherits parent's angle and color
                const child = new TreeNode(newX, newY, this.angle, this);
                child.color = this.color; // Inherit parent's color
                this.children.push(child);
                drawPixel(newX, newY, child.color);
                return child;
            }
        }
        
        // If no valid direction found after attempts, return null
        return null;
    }
    
    branch() {
        // Choose either +45 or -45 degrees from current angle
        const offset = Math.random() < 0.5 ? 45 : -45;
        const branchAngle = ((this.angle + offset) % 360 + 360) % 360;
        
        // Check if current position is too close to edge in branch growth direction
        if (isTooCloseToEdge(this.x, this.y, branchAngle)) {
            // Start a flower at this position if not already stopped
            if (!this.isStopped) {
                this.isStopped = true;
                createFlowerAtPosition(this.x, this.y);
            }
            return null;
        }
        
        const dir = angleToDirection(branchAngle);
        
        const newX = this.x + dir.x;
        const newY = this.y + dir.y;
        
        if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE && 
            !isPositionOccupied(newX, newY)) {
            const child = new TreeNode(newX, newY, branchAngle, this);
            child.color = getRandomBranchColor(); // Assign random color to new branch
            this.children.push(child);
            drawPixel(newX, newY, child.color);
            
            return child;
        }
        return null;
    }
    
    // Check if this node is an ending (leaf) node
    isEnding() {
        return this.children.length === 0 && !this.isStopped;
    }
    
    // Get all ending nodes in this subtree
    getEndingNodes() {
        const endings = [];
        
        function traverse(node) {
            if (node.isEnding()) {
                endings.push(node);
            } else {
                node.children.forEach(child => traverse(child));
            }
        }
        
        traverse(this);
        return endings;
    }
    
    // Get all nodes in this subtree
    getAllNodes() {
        const allNodes = [];
        
        function traverse(node) {
            allNodes.push(node);
            node.children.forEach(child => traverse(child));
        }
        
        traverse(this);
        return allNodes;
    }
}

// Flower class - represents an entire flower
class Flower {
    constructor(centerX, centerY) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.petalPositions = []; // Store petal positions
        
        // Create 2x2 yellow cube at center
        this.yellowPixels = [
            {x: centerX, y: centerY},
            {x: centerX + 1, y: centerY},
            {x: centerX, y: centerY + 1},
            {x: centerX + 1, y: centerY + 1}
        ];
        
        // Draw the initial flower
        this.draw();
    }
    
    grow() {
        // Define all possible petal positions
        const possiblePetals = [
            // Top petals
            {x: this.centerX, y: this.centerY - 1},
            {x: this.centerX + 1, y: this.centerY - 1},
            // Right petals  
            {x: this.centerX + 2, y: this.centerY},
            {x: this.centerX + 2, y: this.centerY + 1},
            // Bottom petals
            {x: this.centerX, y: this.centerY + 2},
            {x: this.centerX + 1, y: this.centerY + 2},
            // Left petals
            {x: this.centerX - 1, y: this.centerY},
            {x: this.centerX - 1, y: this.centerY + 1}
        ];
        
        // Find a valid petal position that hasn't been added yet
        for (const petal of possiblePetals) {
            if (petal.x >= 0 && petal.x < GRID_SIZE && petal.y >= 0 && petal.y < GRID_SIZE &&
                !this.isPositionOccupiedByFlower(petal.x, petal.y) &&
                !this.petalPositions.some(existing => existing.x === petal.x && existing.y === petal.y)) {
                
                this.petalPositions.push(petal);
                this.draw();
                return; // Only add one petal per call
            }
        }
    }
    
    draw() {
        // Draw yellow center pixels
        fill(255, 255, 0); // Yellow
        for (const pixel of this.yellowPixels) {
            if (pixel.x >= 0 && pixel.x < GRID_SIZE && pixel.y >= 0 && pixel.y < GRID_SIZE) {
                rect(pixel.x * PIXEL_SIZE, pixel.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
        
        // Draw white petal pixels
        fill(0, 0, 255); // White
        for (const petal of this.petalPositions) {
            if (petal.x >= 0 && petal.x < GRID_SIZE && petal.y >= 0 && petal.y < GRID_SIZE) {
                rect(petal.x * PIXEL_SIZE, petal.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
    }
    
    // Check if a position is occupied by this flower
    isPositionOccupiedByFlower(x, y) {
        return this.yellowPixels.some(pixel => pixel.x === x && pixel.y === y) ||
               this.petalPositions.some(petal => petal.x === x && petal.y === y);
    }
}

// Global tree root
let treeRoot = null;

// Check if a position is already occupied by a node
function isPositionOccupied(x, y) {
    if (!treeRoot) return false;
    
    const allNodes = treeRoot.getAllNodes();
    return allNodes.some(node => node.x === x && node.y === y);
}

// Check if a branch is too close to the edge in its growth direction
function isTooCloseToEdge(x, y, angle) {
    const dir = angleToDirection(angle);
    const newX = x + dir.x * MIN_DICTANCE_FROM_EDGE;
    const newY = y + dir.y * MIN_DICTANCE_FROM_EDGE;
    
    return newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE;
}

// Generate random color for branches (shades of green)
function getRandomBranchColor() {
    const greenShades = [
        color(0, 200, 0),    // Dark green
        color(0, 210, 0),    // Slightly lighter dark green
        color(0, 190, 0),    // Slightly darker green
        color(0, 205, 0),    // Medium dark green
        color(0, 195, 0),    // Medium green
        color(0, 220, 0),    // Lighter green
        color(0, 185, 0),    // Darker medium green
        color(0, 215, 0),    // Medium-light green
        color(0, 180, 0),    // Darker shade
        color(0, 225, 0),    // Lightest shade
        color(0, 175, 0),    // Very dark shade
        color(0, 230, 0)     // Light green
    ];
    return greenShades[Math.floor(Math.random() * greenShades.length)];
}

// Global variables for flower management
let flowers = [];
let flowerGrowthInterval = null;

// Check if a position is occupied by any flower
function isPositionOccupiedByFlower(x, y) {
    return flowers.some(flower => flower.isPositionOccupiedByFlower(x, y));
}

// Find flower at specific position
function findFlowerAt(x, y) {
    return flowers.find(flower => flower.isPositionOccupiedByFlower(x, y));
}

function setup() {
    createCanvas(GRID_SIZE * PIXEL_SIZE, GRID_SIZE * PIXEL_SIZE);
    noStroke();
    
    // Initialize grid with white pixels
    for (let x = 0; x < GRID_SIZE; x++) {
        pixelGrid[x] = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            pixelGrid[x][y] = color(255);
        }
    }
    
    drawGrid();
}

function keyPressed() {
    if (key === 'b' || key === 'B') {
        branchTree();
    } else if (key === 'f' || key === 'F') {
        createFlower();
    }
}

function draw() {
    // Only redraw when needed
}

// Main function to draw a pixel at grid position (x, y) with given color
function drawPixel(x, y, col) {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        pixelGrid[x][y] = col;
        fill(col);
        rect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    }
}

// Draw the entire grid
function drawGrid() {
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            fill(pixelGrid[x][y]);
            rect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
    }
}

// Start function - creates the root of the tree
function start() {
    // Create root node at bottom center with angle 90 (up)
    const x = Math.floor(GRID_SIZE / 2); // Center x position
    const y = GRID_SIZE - 1; // Bottom row (0-indexed)
    treeRoot = new TreeNode(x, y, 90); // 90 degrees = up
    drawPixel(x, y, treeRoot.color);
    
    // Start auto-growth automatically
    isAutoGrowing = true;
    autoGrowthInterval = setInterval(growTree, 100); // 5 times per second
}

// Global variables for auto-growth
let isAutoGrowing = false;
let autoGrowthInterval = null;

// Function to grow from a random ending node
function growTree() {
    // Grow branches
    if (treeRoot) {
        const endingNodes = treeRoot.getEndingNodes();
        endingNodes.forEach(node => {
            if (!node.isStopped) {
                node.grow();
            }
        });
    }
    
    // Grow flowers
    if (flowers.length > 0) {
        flowers.forEach(flower => flower.grow());
    }
}

// Toggle auto-growth (5 times per second = 200ms interval)
function toggleAutoGrowth() {
    isAutoGrowing = !isAutoGrowing;
    
    if (isAutoGrowing) {
        autoGrowthInterval = setInterval(growTree, 100); // 5 times per second
        document.getElementById('autoBtn').textContent = 'Stop Auto';
    } else {
        clearInterval(autoGrowthInterval);
        document.getElementById('autoBtn').textContent = 'Auto Grow';
    }
}

// Function to branch from a random node in the tree
function branchTree() {
    if (!treeRoot) return;
    
    const allNodes = treeRoot.getAllNodes();
    if (allNodes.length > 0) {
        const randomNode = allNodes[Math.floor(Math.random() * allNodes.length)];
        for (let i = 0; i < 10; i++) {
            b = randomNode.branch();
            if (b) break;
        }
    }
}

// Function to create a flower at a specific position
function createFlowerAtPosition(x, y) {
    // Adjust center to ensure 2x2 cube fits within bounds
    let centerX = x;
    let centerY = y;
    
    // Adjust if too close to right or bottom edges
    if (centerX >= GRID_SIZE - 1) centerX = GRID_SIZE - 2;
    if (centerY >= GRID_SIZE - 1) centerY = GRID_SIZE - 2;
    
    const flower = new Flower(centerX, centerY);
    flowers.push(flower);
    
    // Start continuous flower growth if not already started
    if (!flowerGrowthInterval) {
        flowerGrowthInterval = setInterval(growFlowers, 1000); // Grow flowers every 1 second
    }
}

// Function to create a flower at a random ending node and stop its growth
function createFlower() {
    if (!treeRoot) return;
    
    const endingNodes = treeRoot.getEndingNodes();
    if (endingNodes.length > 0) {
        // Pick a random ending node
        const randomEndingNode = endingNodes[Math.floor(Math.random() * endingNodes.length)];
        
        // Create a flower centered at this position
        // Adjust center to ensure 2x2 cube fits within bounds
        let centerX = randomEndingNode.x;
        let centerY = randomEndingNode.y;
        
        // Adjust if too close to right or bottom edges
        if (centerX >= GRID_SIZE - 1) centerX = GRID_SIZE - 2;
        if (centerY >= GRID_SIZE - 1) centerY = GRID_SIZE - 2;
        
        const flower = new Flower(centerX, centerY);
        flowers.push(flower);
        
        // Stop growth of this branch
        randomEndingNode.isStopped = true;
        
        // Start continuous flower growth if not already started
        if (!flowerGrowthInterval) {
            flowerGrowthInterval = setInterval(growFlowers, 1000); // Grow flowers every 1 second
        }
    }
}

// Function to grow only flowers
function growFlowers() {
    if (flowers.length > 0) {
        flowers.forEach(flower => flower.grow());
    }
}
