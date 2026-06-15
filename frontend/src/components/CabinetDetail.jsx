import React, { useState, useEffect } from 'react'
import { Descriptions, Tag, Spin, message } from 'antd'
import { cabinetAPI } from '../services/api'

const CabinetDetail = ({ cabinetId }) => {
  const [slots, setSlots] = useState([])
  const [cabinet, setCabinet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cabinetId) {
      loadData()
    }
  }, [cabinetId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cabinetData, slotsData] = await Promise.all([
        cabinetAPI.get(cabinetId),
        cabinetAPI.getSlots(cabinetId)
      ])
      setCabinet(cabinetData)
      setSlots(slotsData)
    } catch (error) {
      message.error('加载柜机详情失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getSlotStatusText = (status) => {
    const statusMap = {
      empty: { text: '空闲', color: 'default' },
      occupied: { text: '占用', color: 'blue' },
      fault: { text: '故障', color: 'red' },
      locked: { text: '锁定', color: 'orange' }
    }
    return statusMap[status] || { text: status, color: 'default' }
  }

  const getHealthClass = (soc) => {
    if (soc >= 80) return 'health-high'
    if (soc >= 50) return 'health-medium'
    return 'health-low'
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
  }

  return (
    <div>
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="柜机编号">{cabinet?.cabinet_no}</Descriptions.Item>
        <Descriptions.Item label="地址">{cabinet?.address}</Descriptions.Item>
        <Descriptions.Item label="格口总数">{cabinet?.total_slots}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={cabinet?.status === 'online' ? 'green' : 'red'}>
            {cabinet?.status === 'online' ? '在线' : '离线'}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      <h4 style={{ marginBottom: 12 }}>格口状态</h4>
      <div className="slot-grid">
        {slots.map(slot => {
          const statusInfo = getSlotStatusText(slot.status)
          return (
            <div 
              key={slot.id} 
              className={`slot-item ${slot.status}`}
              title={`${slot.slot_no} - ${statusInfo.text}`}
            >
              <div style={{ fontSize: 10, marginBottom: 4 }}>{slot.slot_no.split('-')[1]}</div>
              {slot.battery && slot.status === 'occupied' ? (
                <>
                  <div className="slot-soc">{Math.round(slot.battery.current_soc)}%</div>
                  <div className="battery-health-bar" style={{ width: '80%', height: 4 }}>
                    <div 
                      className={`battery-health-fill ${getHealthClass(slot.battery.current_soc)}`}
                      style={{ width: `${slot.battery.current_soc}%` }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 10 }}>{statusInfo.text}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CabinetDetail
