import React, { useState, useEffect, useRef } from 'react'
import { Row, Col, Card, Statistic, Tag, Drawer, List, Badge, Spin, message } from 'antd'
import { 
  EnvironmentOutlined, 
  
  WarningOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { cabinetAPI, statsAPI } from '../services/api'
import CabinetDetail from '../components/CabinetDetail'

const customIcon = (status, lowCount) => {
  let color = '#52c41a'
  if (lowCount > 0) color = '#faad14'
  if (status === 'offline') color = '#8c8c8c'
  if (status === 'maintenance') color = '#fa8c16'
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">⚡</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  })
}

const MapPage = () => {
  const [cabinets, setCabinets] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCabinet, setSelectedCabinet] = useState(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const mapRef = useRef()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cabinetData, statsData] = await Promise.all([
        cabinetAPI.list(),
        statsAPI.overview()
      ])
      setCabinets(cabinetData)
      setStats(statsData)
    } catch (error) {
      message.error('加载数据失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCabinetClick = (cabinet) => {
    setSelectedCabinet(cabinet)
    setDrawerVisible(true)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  const center = cabinets.length > 0 
    ? [cabinets.reduce((sum, c) => sum + c.latitude, 0) / cabinets.length,
       cabinets.reduce((sum, c) => sum + c.longitude, 0) / cabinets.length]
    : [39.9, 116.4]

  return (
    <div>
      <h2 className="page-title">柜点地图</h2>
      
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="总柜机数" 
              value={stats?.total_cabinets || 0}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="在线柜机" 
              value={stats?.online_cabinets || 0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="电池总数" 
              value={stats?.total_batteries || 0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="待处理工单" 
              value={stats?.pending_orders || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="map-container">
        <MapContainer 
          center={center} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {cabinets.map(cabinet => (
            <Marker
              key={cabinet.id}
              position={[cabinet.latitude, cabinet.longitude]}
              icon={customIcon(cabinet.status, cabinet.low_battery_count)}
              eventHandlers={{
                click: () => handleCabinetClick(cabinet)
              }}
            >
              <Popup>
                <div>
                  <h4 style={{ margin: 0, marginBottom: 8 }}>{cabinet.name}</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#666' }}>{cabinet.address}</p>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <Tag color="green">空闲: {cabinet.available_slots}</Tag>
                    <Tag color="red">故障: {cabinet.fault_slots}</Tag>
                    {cabinet.low_battery_count > 0 && (
                      <Tag color="orange">低电: {cabinet.low_battery_count}</Tag>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <Drawer
        title={selectedCabinet?.name}
        placement="right"
        width={400}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedCabinet && (
          <CabinetDetail cabinetId={selectedCabinet.id} />
        )}
      </Drawer>
    </div>
  )
}

export default MapPage
