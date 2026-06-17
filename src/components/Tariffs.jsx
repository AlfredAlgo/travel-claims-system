import React from 'react';
import { Card, CardTitle, PersalTag } from './Shared';
import { TARIFFS, ST_CODES } from '../data/constants';

export default function Tariffs() {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Tariff table</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          Monthly tariffs per km — update when DPSA publishes new rates
        </div>
      </div>

      <Card>
        <CardTitle>Vehicle tariffs — private motor vehicle</CardTitle>
        <table>
          <thead>
            <tr>
              <th>Engine capacity</th>
              <th>Code 0469 — more than 8 000 km/yr</th>
              <th>Code 0470 — less than 8 000 km/yr</th>
              <th>Effective from</th>
            </tr>
          </thead>
          <tbody>
            {TARIFFS.map(t => (
              <tr key={t.engine}>
                <td>{t.engine}</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {t.r469.toFixed(2)} / km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {t.r470.toFixed(2)} / km</td>
                <td style={{ color: 'var(--text2)', fontSize: 12 }}>{t.from}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardTitle>S&T allowance codes — Persal function 5.3.11</CardTitle>
        <table>
          <thead>
            <tr><th>Persal code</th><th>Description</th><th>SARS code</th></tr>
          </thead>
          <tbody>
            {ST_CODES.map(s => (
              <tr key={s.code}>
                <td><PersalTag code={s.code} /></td>
                <td>{s.desc}</td>
                <td><PersalTag code={s.sars} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
