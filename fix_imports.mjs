import fs from 'fs';

const files = {
  'src/components/BookingSummary.tsx': [/import React from 'react';\n/, ''],
  'src/components/CinemaScene.tsx': [/import React, { Suspense }/, 'import { Suspense }'],
  'src/components/CinemaSeat.tsx': [/import React, { useRef, useState }/, 'import { useRef, useState }'],
  'src/components/SeatLegend.tsx': [/import React from 'react';\n/, ''],
  'src/pages/Placeholders.tsx': [/import { Link } from 'react-router-dom';\n/, ''],
  'src/pages/SeatSelection.tsx': [/import React, { useState, useEffect, useMemo }/, 'import { useState, useMemo }']
};

for (const [file, [regex, repl]] of Object.entries(files)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(regex, repl);
  if (file === 'src/components/CinemaSeat.tsx') {
    content = content.replace(/useFrame\(\(state, delta\)/, 'useFrame((_state, delta)');
  }
  fs.writeFileSync(file, content);
}
console.log('Fixed imports');
