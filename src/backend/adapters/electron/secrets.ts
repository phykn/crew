import { safeStorage } from 'electron';
import type { Secrets, SettingRecords } from '../../app/ports';

// Saved in the record's settings, encrypted with the operating system's own key store, so a copied record file gives nothing away
export class SafeSecrets implements Secrets {
  constructor(private settings: SettingRecords) {}

  read(name: string) {
    const saved = this.settings.readSetting(`secret.${name}`);
    return saved ? safeStorage.decryptString(Buffer.from(saved, 'base64')) : null;
  }

  write(name: string, value: string) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('이 컴퓨터에서는 키를 암호화해 저장할 수 없습니다');
    this.settings.writeSetting(`secret.${name}`, safeStorage.encryptString(value).toString('base64'));
  }

  remove(name: string) {
    this.settings.deleteSetting(`secret.${name}`);
  }
}
