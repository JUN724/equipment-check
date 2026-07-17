/**
 * 设备配置数据
 * 修改此文件即可更新设备信息和点检项目
 */
const DEVICES = [
  {
    id: 1,
    name: '单刀异型玻璃切割机',
    model: 'HXL-YX-1312Z',
    checks: [
      '设备表面残渣清理',
      '检查刀轮切割米数，实际切割效果',
      '检查设备气压是否在0.5MPa以上',
      '检查操作人员无尘服和静电手环'
    ]
  },
  {
    id: 2,
    name: '全视觉对位五刀玻璃切割机',
    model: 'HXL-TFT-1312Z',
    checks: [
      '设备表面残渣清理',
      '检查刀轮切割米数，实际切割效果',
      '检查设备气压是否在0.5MPa以上',
      '检查操作人员无尘服和静电手环'
    ]
  },
  {
    id: 3,
    name: '激光玻璃切割机',
    model: 'LCU-10050I',
    checks: [
      '扫视设备内部残渣是否需要清理',
      '检查水箱温度',
      '检查操作人员无尘服和静电手环'
    ]
  },
  {
    id: 4,
    name: '全自动清洗机&CELL点亮检测机',
    model: 'LH-CL2000A',
    checks: [
      '检查水箱是否漏水',
      '清理测试机杂物'
    ]
  }
];

/** 根据ID获取设备 */
function getDeviceById(id) {
  return DEVICES.find(d => d.id === id) || null;
}

/** 设备颜色主题 */
const DEVICE_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed'];
function getDeviceColor(id) {
  return DEVICE_COLORS[(id - 1) % DEVICE_COLORS.length];
}
