const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const generateIcon = (size, fileName) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, size, size);

  // Border (Hacker green)
  ctx.strokeStyle = '#3fb950';
  ctx.lineWidth = size * 0.05;
  ctx.strokeRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9);

  // Text
  ctx.fillStyle = '#58a6ff';
  ctx.font = `bold ${size * 0.5}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⌚', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(__dirname, '..', 'public', fileName);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated ${fileName}`);
};

generateIcon(192, 'icon-192.png');
generateIcon(512, 'icon-512.png');
