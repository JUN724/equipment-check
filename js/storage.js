/**
 * localStorage 存储层封装
 * 数据结构：
 * {
 *   "device_1": {
 *     "2026-07-17": { timestamp, technician, items: { "0": {status, note, photos}, ... } }
 *   }
 * }
 */

const STORAGE_KEY = 'equipment_check_records';
const MAX_PHOTOS_PER_ITEM = 3;
const PHOTO_MAX_WIDTH = 800;
const PHOTO_QUALITY = 0.5;

/** 获取全部数据 */
function getAllRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('读取存储失败:', e);
    return {};
  }
}

/** 保存全部数据 */
function saveAllRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('保存数据失败，可能存储空间不足:', e);
    alert('保存失败！存储空间不足，请清理旧数据或导出备份。');
  }
}

/** 获取某设备某天的记录 */
function getRecord(deviceId, dateStr) {
  const records = getAllRecords();
  const key = `device_${deviceId}`;
  return (records[key] && records[key][dateStr]) || null;
}

/** 保存某设备某天的记录 */
function saveRecord(deviceId, dateStr, data) {
  const records = getAllRecords();
  const key = `device_${deviceId}`;
  if (!records[key]) records[key] = {};
  records[key][dateStr] = data;
  saveAllRecords(records);
}

/** 获取某设备所有记录日期 */
function getDeviceDates(deviceId) {
  const records = getAllRecords();
  const key = `device_${deviceId}`;
  return records[key] ? Object.keys(records[key]).sort() : [];
}

/** 检查某设备今天是否已点检 */
function isCheckedToday(deviceId) {
  const today = getTodayStr();
  return getRecord(deviceId, today) !== null;
}

/** 获取今天日期字符串 */
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 获取当前时间字符串 */
function getNowStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/** 拍照并压缩为 base64 */
function capturePhoto() {
  return new Promise((resolve, reject) => {
    // 创建 input 来拍照
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // 优先后置摄像头

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) { reject('未选择图片'); return; }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > PHOTO_MAX_WIDTH) {
            h = Math.round(h * PHOTO_MAX_WIDTH / w);
            w = PHOTO_MAX_WIDTH;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };

    input.oncancel = () => reject('取消拍照');
    input.click();
  });
}

/** 计算某月各设备点检统计 */
function getMonthStats(year, month) {
  const records = getAllRecords();
  const daysInMonth = new Date(year, month, 0).getDate();
  const stats = {};

  DEVICES.forEach(device => {
    const key = `device_${device.id}`;
    const deviceRecords = records[key] || {};
    let checked = 0, abnormal = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (deviceRecords[dateStr]) {
        checked++;
        // 检查是否有异常项
        const items = deviceRecords[dateStr].items;
        if (items) {
          for (const key of Object.keys(items)) {
            if (items[key].status === 'abnormal') {
              abnormal++;
              break;
            }
          }
        }
      }
    }

    stats[device.id] = { checked, abnormal, total: daysInMonth };
  });

  return stats;
}

/** 获取某月每天各设备的点检状态（用于日历） */
function getMonthDailyStatus(year, month) {
  const records = getAllRecords();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daily = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daily[dateStr] = {};

    DEVICES.forEach(device => {
      const key = `device_${device.id}`;
      const record = (records[key] && records[key][dateStr]) || null;
      if (record) {
        let hasAbnormal = false;
        const items = record.items || {};
        for (const k of Object.keys(items)) {
          if (items[k].status === 'abnormal') { hasAbnormal = true; break; }
        }
        daily[dateStr][device.id] = hasAbnormal ? 'abnormal' : 'normal';
      } else {
        daily[dateStr][device.id] = 'unchecked';
      }
    });
  }

  return daily;
}

/** 导出全部数据为 JSON 文件 */
function exportAllData() {
  const records = getAllRecords();
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `点检数据备份_${getTodayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 导入 JSON 备份 */
function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (typeof data !== 'object') throw new Error('格式错误');
        saveAllRecords(data);
        resolve(data);
      } catch (err) {
        reject('文件格式不正确');
      }
    };
    reader.onerror = () => reject('读取文件失败');
    reader.readAsText(file);
  });
}

/** 清理超过 N 天的数据 */
function cleanOldData(days = 90) {
  const records = getAllRecords();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

  let cleaned = 0;
  for (const devKey of Object.keys(records)) {
    for (const dateStr of Object.keys(records[devKey])) {
      if (dateStr < cutoffStr) {
        delete records[devKey][dateStr];
        cleaned++;
      }
    }
    if (Object.keys(records[devKey]).length === 0) {
      delete records[devKey];
    }
  }

  saveAllRecords(records);
  return cleaned;
}

/** 清除所有数据 */
function clearAllData() {
  if (confirm('确定要清除所有点检数据吗？此操作不可恢复！\n建议先导出备份。')) {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  }
  return false;
}
