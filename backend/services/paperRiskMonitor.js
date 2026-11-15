const {
  startDeltaMarkPriceStream,
  stopDeltaMarkPriceStream,
  getFreshMarkPrice,
} = require('./deltaMarkPriceStream');
const { monitorOpenPositions } = require('./paperPositionService');

const MONITOR_INTERVAL_MS = 1_000;
let monitorTimer = null;
let monitorInFlight = false;

const startPaperRiskMonitor = () => {
  if (monitorTimer) return;
  startDeltaMarkPriceStream();
  console.log('[Paper Risk Monitor] Started 1-second local SL/TP checks.');

  monitorTimer = setInterval(async () => {
    if (monitorInFlight) return;
    monitorInFlight = true;
    try {
      await monitorOpenPositions({ getPrice: getFreshMarkPrice });
    } catch (error) {
      console.error('[Paper Risk Monitor] Check failed:', error.message);
    } finally {
      monitorInFlight = false;
    }
  }, MONITOR_INTERVAL_MS);

  monitorTimer.unref?.();
};

const stopPaperRiskMonitor = () => {
  if (monitorTimer) clearInterval(monitorTimer);
  monitorTimer = null;
  stopDeltaMarkPriceStream();
};

module.exports = { startPaperRiskMonitor, stopPaperRiskMonitor };
