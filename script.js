// Grid dimensions
const PIXEL_SIZE = 15; // Each pixel will be 10x10 screen pixels
const GRID_WIDTH = Math.floor(window.innerWidth / PIXEL_SIZE);
const GRID_HEIGHT = Math.floor((window.innerHeight) / PIXEL_SIZE); // Account for button area at bottom
const MIN_DISTANCE_FROM_EDGE = 5; // Minimum distance from edge to allow growth

class BranchNode {
    static root = null; // Static reference to the root node

    static DIRECTION_PROBABILITIES = {
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
    static DIR_TO_VEC = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
    }

    constructor(x, y, parent = null) {
        this.x = x;
        this.y = y;
        this.children = [];
        this.parent = parent;
        if (parent) {
            const newBranch = parent.children.length > 0;
            this.angle = newBranch ? ((parent.angle + (Math.random() < 0.5 ? 45 : -45) + 360) % 360) : parent.angle;
            this.color = newBranch ? BranchNode.getRandomBranchColor() : parent.color;
        } else {
            this.angle = 90; // Default to upward growth
            this.color = BranchNode.getRandomBranchColor();
        }
    }
    
    grow() {
        // Check if current position is too close to edge in growth direction
        if (this.isAtEdge(this.x, this.y)) {
            // Start a flower at this position if not already stopped
            if (!this.isStopped) {
                this.isStopped = true;
                new Flower(this.x, this.y);
            }
            return null;
        }
        
        // Try to find a valid direction (up to 10 attempts)
        for (let attempt = 0; attempt < 10; attempt++) {
            const dir = BranchNode.chooseDirection(this.angle);
            
            const newX = this.x + dir.x;
            const newY = this.y + dir.y;
            
            // Check bounds and if position is empty
            if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT && 
                this.canGrowInto(newX, newY)) {
                const child = new BranchNode(newX, newY, parent=this);
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
        const branch = new BranchNode(this.x, this.y, parent=this);
        this.children.push(branch);
        branch.grow();

        return branch;
    }

    // Generate random color for branches (shades of green)
    static getRandomBranchColor() {
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
    
    // Get all ending nodes in this subtree
    getEndingNodes() {
        const endings = [];
        
        function traverse(node) {
            if (node.children.length === 0 && !node.isStopped) {
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
    
    // Check if a position is already occupied by a node
    canGrowInto(x, y) { 
        if (!BranchNode.root) return false;
        
        const allNodes = BranchNode.root.getAllNodes();
        return !allNodes.some(node => node.x === x && node.y === y && node.color === this.color);
    }
    // Check if a branch is too close to the edge in its growth direction
    isAtEdge(x, y) {
        const dir = BranchNode.angleToDirection(this.angle);
        const newX = x + dir.x * MIN_DISTANCE_FROM_EDGE;
        const newY = y + dir.y * MIN_DISTANCE_FROM_EDGE;
        
        return newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT;
    }

    // // Convert angle in degrees to grid direction
    static angleToDirection(angle) {
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

    // Choose a direction based on probabilities
    static chooseDirection(angle) {
        // Normalize angle to 0-360
        angle = ((angle % 360) + 360) % 360;
        const probabilities = BranchNode.DIRECTION_PROBABILITIES[angle];

        const rand = Math.random();
        let cumulative = 0;
        
        const directions = ['up', 'right', 'down', 'left'];
        for (const dir of directions) {
            cumulative += probabilities[dir];
            if (rand <= cumulative) {
                return BranchNode.DIR_TO_VEC[dir];
            }
        }

        throw "Error: Direction probabilities do not sum to 1."
    }
}
    
// Flower class - represents an entire flower
class Flower {
    static COLORS = [
        [255, 0, 0],    // Red
        [255, 165, 0],  // Orange
        [0, 0, 255],    // Blue
        [128, 0, 128]   // Purple
    ];
    static flowers = []; // Static array to hold all flower instances

    constructor(centerX, centerY) {
        // Adjust if too close to right or bottom edges
        if (centerX >= GRID_WIDTH - 1) centerX = GRID_WIDTH - 2;
        if (centerY >= GRID_HEIGHT - 1) centerY = GRID_HEIGHT - 2;

        this.centerX = centerX;
        this.centerY = centerY;

        this.petalPositions = []; // Store petal positions
        this.color = Flower.COLORS[Math.floor(Math.random() * Flower.COLORS.length)];
        
        // Create 2x2 yellow cube at center
        this.centerPixels = [
            {x: centerX, y: centerY},
            {x: centerX + 1, y: centerY},
            {x: centerX, y: centerY + 1},
            {x: centerX + 1, y: centerY + 1}
        ];
        
        // Draw the initial flower
        this.draw();
        Flower.flowers.push(this);
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
            if (petal.x >= 0 && petal.x < GRID_WIDTH && petal.y >= 0 && petal.y < GRID_HEIGHT &&
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
        for (const pixel of this.centerPixels) {
            if (pixel.x >= 0 && pixel.x < GRID_WIDTH && pixel.y >= 0 && pixel.y < GRID_HEIGHT) {
                rect(pixel.x * PIXEL_SIZE, pixel.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
        
        fill(this.color[0], this.color[1], this.color[2]); // Petal color
        for (const petal of this.petalPositions) {
            if (petal.x >= 0 && petal.x < GRID_WIDTH && petal.y >= 0 && petal.y < GRID_HEIGHT) {
                rect(petal.x * PIXEL_SIZE, petal.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
    }
}

class Pot {
    static GROW_POINT = {x: 3, y: 1}; // Relative to pot image
    static img;
    static x;
    static y;

    static load () {
        Pot.img = loadImage('pot.png');
    }

    static getGrowPoint() {
        return {x: Pot.x + Pot.GROW_POINT.x, y: Pot.y + Pot.GROW_POINT.y};
    }

    static draw() {
        Pot.img.loadPixels();
        Pot.x = Math.floor((GRID_WIDTH - Pot.img.width) / 2);
        Pot.y = GRID_HEIGHT - Pot.img.height;

        // 2. Loop through every pixel
        for (let y = 0; y < Pot.img.height; y++) {
            for (let x = 0; x < Pot.img.width; x++) {

                // Calculate the index in the flat array
                let index = (x + y * Pot.img.width) * 4;
                let r = Pot.img.pixels[index];
                let g = Pot.img.pixels[index + 1];
                let b = Pot.img.pixels[index + 2];
                let a = Pot.img.pixels[index + 3];
                
                // If pixel is not transparent, draw it on the grid
                if (a > 0) {
                    drawPixel(Pot.x + x, Pot.y + y, `rgb(${r}, ${g}, ${b})`);
                }
            }
        }
    }
}

function preload() {
    console.log("Preloading pot image");
    Pot.load();
}

function setup() {
    const canvas = createCanvas(GRID_WIDTH * PIXEL_SIZE, GRID_HEIGHT * PIXEL_SIZE);
    canvas.parent('canvas-container');
    canvas.id("canvas");
    
    noStroke();

    Pot.draw();
}

function keyPressed() {
    if (key === 'b' || key === 'B') {
        branchBtn();
    } else if (key === 'f' || key === 'F') {
        flowerBtn();
    }
}

// Main function to draw a pixel at grid position (x, y) with given color
function drawPixel(x, y, col) {
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        fill(col);
        rect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    }
}

// Start/Kill function - toggles between grow and kill modes
function bigBtn() {
    const button = document.getElementById('bigBtn');
    
    if (button.textContent === 'Grow') {
        start();

        button.textContent = 'Kill';
        button.classList.add('kill');
        button.classList.remove('grow');
    } else {
        reset();

        button.textContent = 'Grow';
        button.classList.add('grow');
        button.classList.remove('kill');
    }
}

function start() {
    // Show options
    document.querySelector('.options').style.display = 'flex';
    
    const growPoint = Pot.getGrowPoint();
    
    // Create root node at the GROW_POINT position with angle 90 (up)
    BranchNode.root = new BranchNode(growPoint.x, growPoint.y); // 90 degrees = up
    drawPixel(growPoint.x, growPoint.y, BranchNode.root.color);

    tickInterval = setInterval(tick, 100); // 5 times per second
}

// Reset game state back to beginning
function reset() {
    // Stop auto-growth
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
    isAutoGrowing = false;
    
    // Clear plant and Flower.flowers
    BranchNode.root = null;
    Flower.flowers = [];
    
    // Reset grid
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            drawPixel(x, y, color(255));
        }
    }
    
    // Redraw pot (so it persists)
    Pot.draw();
    
    // Hide options
    document.querySelector('.options').style.display = 'none';
}

// // Global variables for auto-growth
let tickInterval = null;

// Function to grow from a random ending node
function tick() {
    // Grow branches
    if (BranchNode.root) {
        const endingNodes = BranchNode.root.getEndingNodes();
        endingNodes.forEach(node => {
            if (!node.isStopped) {
                node.grow();
            }
        });
    }
    
    Flower.flowers.forEach(flower => flower.grow());
}

// Function to branch from a random node in the tree
function branchBtn() {
    if (!BranchNode.root) return;
    
    const allNodes = BranchNode.root.getAllNodes();
    if (allNodes.length > 0) {
        const randomNode = allNodes[Math.floor(Math.random() * allNodes.length)];
        for (let i = 0; i < 10; i++) {
            b = randomNode.branch();
            if (b) break;
        }
    }
}

// Function to create a flower at a random ending node and stop its growth
function flowerBtn() {
    if (!BranchNode.root) return;
    
    const endingNodes = BranchNode.root.getEndingNodes();
    if (endingNodes.length > 0) {
        const randomEndingNode = endingNodes[Math.floor(Math.random() * endingNodes.length)];
        new Flower(randomEndingNode.x, randomEndingNode.y);
        randomEndingNode.isStopped = true;
    }
}