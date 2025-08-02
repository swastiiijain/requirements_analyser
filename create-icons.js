const fs = require('fs');
const path = require('path');

// Simple function to create PNG data from SVG with different sizes
function createIconsFromSVG() {
  const sizes = [16, 32, 48, 128];
  const svgContent = fs.readFileSync('extension/icons/robot-icon.svg', 'utf8');
  
  sizes.forEach(size => {
    // Update SVG dimensions for each size
    const resizedSVG = svgContent
      .replace('width="128"', `width="${size}"`)
      .replace('height="128"', `height="${size}"`);
    
    // Write the resized SVG (browsers can use SVG directly, but we'll try to convert to PNG)
    const outputPath = `extension/icons/icon${size}.svg`;
    fs.writeFileSync(outputPath, resizedSVG);
    console.log(`Created icon${size}.svg`);
  });
  
  console.log('\nSVG icons created. If you have ImageMagick or another converter, run:');
  sizes.forEach(size => {
    console.log(`convert extension/icons/icon${size}.svg extension/icons/icon${size}.png`);
  });
}

// Check if sharp is available for PNG conversion
try {
  const sharp = require('sharp');
  
  async function convertWithSharp() {
    const sizes = [16, 32, 48, 128];
    const svgBuffer = fs.readFileSync('extension/icons/robot-icon.svg');
    
    for (const size of sizes) {
      try {
        await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toFile(`extension/icons/icon${size}.png`);
        console.log(`Created icon${size}.png`);
      } catch (err) {
        console.error(`Error creating icon${size}.png:`, err.message);
      }
    }
  }
  
  convertWithSharp().then(() => {
    console.log('PNG icons created successfully!');
  }).catch(err => {
    console.error('Sharp conversion failed:', err.message);
    createIconsFromSVG();
  });
  
} catch (err) {
  console.log('Sharp not available, creating SVG icons instead...');
  createIconsFromSVG();
} 