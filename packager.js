const fs = require('fs');

const eventsJson = JSON.parse(fs.readFileSync('events.json', 'utf-8'));
const TIMESCALE = 1000; // 1 unidad = 1 ms

const samples = [];

// Sample 0: manifest en t=0
const manifest = {
  ivf: '1.0',
  type: 'manifest',
  id: 'manifest-001'
};
samples.push({ dts: 0, data: Buffer.from(JSON.stringify(manifest), 'utf-8') });

// Un sample por cada evento en events.json
eventsJson.events.forEach((event, i) => {
  const dts = Math.round((event.t || 0) * TIMESCALE);
  const sample = {
    ivf: '1.0',
    id: event.id || `event-${String(i + 1).padStart(3, '0')}`,
    ...event
  };
  samples.push({ dts, data: Buffer.from(JSON.stringify(sample), 'utf-8') });
});

// Ordenar por DTS
samples.sort((a, b) => a.dts - b.dts);

// Garantizar DTS único (si hay colisión, +1ms)
for (let i = 1; i < samples.length; i++) {
  if (samples[i].dts <= samples[i - 1].dts) {
    samples[i].dts = samples[i - 1].dts + 1;
  }
}

// Escribir ivf_track.media (samples concatenados en binario)
fs.writeFileSync('ivf_track.media', Buffer.concat(samples.map(s => s.data)));

// Escribir ivf_track.nhml (descriptor XML para MP4Box)
let nhml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
nhml += `<NHNTStream version="1.0" timeScale="${TIMESCALE}" mediaType="meta" mediaSubType="mett" baseMediaFile="ivf_track.media">\n`;
for (const s of samples) {
  nhml += `  <NHNTSample DTS="${s.dts}" dataLength="${s.data.length}"/>\n`;
}
nhml += `</NHNTStream>\n`;
fs.writeFileSync('ivf_track.nhml', nhml);

console.log(`ivf_track.nhml e ivf_track.media creados con ${samples.length} samples:`);
samples.forEach(s => console.log(`  DTS=${s.dts}ms → ${s.data.length} bytes`));
