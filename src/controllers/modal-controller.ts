import { dom } from '../state';
import { startListening, cancelCalibration } from '../logic';
import { displayStats } from '../ui';
import { resetStats } from '../storage';
import { setModalVisible, showCalibrationModal } from '../ui-signals';

export function registerModalControls() {
  // --- Settings Modal and its Children ---
  dom.settingsBtn.addEventListener('click', () => {
    setModalVisible('settings', true);
  });

  dom.closeSettingsBtn.addEventListener('click', () => setModalVisible('settings', false));

  dom.settingsModal.addEventListener('click', (e) => {
    if (e.target === dom.settingsModal) setModalVisible('settings', false);
  });

  dom.openCalibrateBtn.addEventListener('click', async () => {
    setModalVisible('settings', false);
    showCalibrationModal('Listening...');
    if (!(await startListening(true))) {
      cancelCalibration();
    }
  });
  dom.cancelCalibrationBtn.addEventListener('click', cancelCalibration);

  dom.openStatsBtn.addEventListener('click', () => {
    setModalVisible('settings', false);
    displayStats();
    setModalVisible('stats', true);
  });
  dom.closeStatsBtn.addEventListener('click', () => setModalVisible('stats', false));
  dom.statsModal.addEventListener('click', (e) => {
    if (e.target === dom.statsModal) setModalVisible('stats', false);
  });
  dom.resetStatsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all your statistics? This cannot be undone.')) {
      resetStats();
      displayStats(); // Re-display the cleared stats
    }
  });

  dom.openGuideBtn.addEventListener('click', () => {
    setModalVisible('settings', false);
    setModalVisible('guide', true);
  });
  dom.closeGuideBtn.addEventListener('click', () => setModalVisible('guide', false));
  dom.guideModal.addEventListener('click', (e) => {
    if (e.target === dom.guideModal) setModalVisible('guide', false);
  });

  dom.openLinksBtn.addEventListener('click', () => {
    setModalVisible('settings', false);
    setModalVisible('links', true);
  });
  dom.closeLinksBtn.addEventListener('click', () => setModalVisible('links', false));
  dom.linksModal.addEventListener('click', (e) => {
    if (e.target === dom.linksModal) setModalVisible('links', false);
  });
}
