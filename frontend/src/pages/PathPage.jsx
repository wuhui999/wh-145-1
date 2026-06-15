import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Space, 
  InputNumber, 
  List, 
  Tag, 
  Spin, 
  message,
  Row,
  Col,
  Statistic,
  Checkbox
} from 'antd'
import { 
  EnvironmentOutlined, 
  ClockCircleOutlined, 
  ThunderboltOutlined,
  SwapOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { pathAPI, workOrderAPI } from '../services/api'
import dayjs from 'dayjs'

const PathPage = () => {
  const [origin, setOrigin] = useState({ lat: 39.95, lng: 116.40 })
  const [pathResult, setPathResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pendingOrders, setPendingOrders] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    loadPendingOrders()
  }, [])

  const loadPendingOrders = async () => {
    setOrdersLoading(true)
    try {
      const data = await workOrderAPI.list({ status: 'pending' })
      setPendingOrders(data)
    } catch (error) {
      message.error('加载工单失败')
      console.error(error)
    } finally {
      setOrdersLoading(false)
    }
  }

  const generatePath = async () => {
    setLoading(true)
    try {
      const data = await pathAPI.suggest({
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        order_ids: selectedOrders.length > 0 ? selectedOrders : undefined
      })
      setPathResult(data)
    } catch (error) {
      message.error('生成路径失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeInfo = (type) => {
    const map = {
      low_battery: { text: '低电量', color: 'orange' },
      fault: { text: '故障', color: 'red' },
      complaint: { text: '投诉', color: 'purple' }
    }
    return map[type] || { text: type, color: 'default' }
  }

  const getPriorityInfo = (priority) => {
    const map = {
      urgent: { text: '紧急', color: 'red' },
      high: { text: '高', color: 'orange' },
      normal: { text: '普通', color: 'blue' },
      low: { text: '低', color: 'green' }
    }
    return map[priority] || { text: priority, color: 'default' }
  }

  const getOrderIcon = (priority) => {
    const colors = { urgent: '#ff4d4f', high: '#fa8c16', normal: '#1890ff', low: '#52c41a' }
    const color = colors[priority] || '#1890ff'
    return L.divIcon({
      className: 'order-marker',
      html: `<div style="
        background: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">⚡</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }

  const originIcon = L.divIcon({
    className: 'origin-marker',
    html: `<div style="
      background: #722ed1;
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
    ">📍</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  })

  const handleOrderSelect = (orderId) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId)
      }
      return [...prev, orderId]
    })
  }

  const selectAllOrders = (checked) => {
    if (checked) {
      setSelectedOrders(pendingOrders.map(o => o.id))
    } else {
      setSelectedOrders([])
    }
  }

  const polylinePositions = pathResult 
    ? [[origin.lat, origin.lng], ...pathResult.points.map(p => [p.latitude, p.longitude])]
    : []

  const mapCenter = origin.lat && origin.lng ? [origin.lat, origin.lng] : [39.9, 116.4]

  return (
    <div>
      <h2 className="page-title">路径建议</h2>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="路径地图" style={{ marginBottom: 16 }}>
            <div className="map-container" style={{ height: 500 }}>
              <MapContainer 
                center={mapCenter} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <Marker 
                  position={[origin.lat, origin.lng]} 
                  icon={originIcon}
                >
                  <Popup>起点位置</Popup>
                </Marker>
                
                {pathResult?.points.map((point, index) => (
                  <Marker
                    key={point.order_id}
                    position={[point.latitude, point.longitude]}
                    icon={getOrderIcon(point.priority)}
                  >
                    <Popup>
                      <div>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>
                          #{index + 1} {point.cabinet_name}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: 12 }}>{point.address}</p>
                        <Tag color={getTypeInfo(point.type).color}>
                          {getTypeInfo(point.type).text}
                        </Tag>
                        <Tag color={getPriorityInfo(point.priority).color}>
                          {getPriorityInfo(point.priority).text}
                        </Tag>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {polylinePositions.length > 1 && (
                  <Polyline 
                    positions={polylinePositions} 
                    color="#1890ff"
                    weight={3}
                    dashArray="10, 10"
                  />
                )}
              </MapContainer>
            </div>
          </Card>

          {pathResult && (
            <Card title="路径概览">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic 
                    title="总站点数" 
                    value={pathResult.points.length}
                    prefix={<SwapOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="总距离" 
                    value={pathResult.total_distance}
                    suffix="km"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="预计总时间" 
                    value={pathResult.total_estimated_time}
                    suffix="分钟"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card 
            title="路径设置" 
            style={{ marginBottom: 16 }}
            extra={
              <Button 
                type="primary" 
                icon={<SwapOutlined />}
                onClick={generatePath}
                loading={loading}
              >
                生成路径
              </Button>
            }
          >
            <div style={{ marginBottom: 16 }}>
              <p style={{ marginBottom: 8, fontWeight: 500 }}>起点坐标</p>
              <Space>
                <div>
                  <span style={{ fontSize: 12, color: '#666' }}>纬度</span>
                  <InputNumber 
                    value={origin.lat} 
                    onChange={(val) => setOrigin({ ...origin, lat: val })}
                    step={0.001}
                    precision={4}
                    style={{ width: 120 }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: 12, color: '#666' }}>经度</span>
                  <InputNumber 
                    value={origin.lng} 
                    onChange={(val) => setOrigin({ ...origin, lng: val })}
                    step={0.001}
                    precision={4}
                    style={{ width: 120 }}
                  />
                </div>
              </Space>
            </div>
          </Card>

          <Card 
            title="待处理工单" 
            extra={
              <Checkbox 
                indeterminate={selectedOrders.length > 0 && selectedOrders.length < pendingOrders.length}
                checked={selectedOrders.length === pendingOrders.length && pendingOrders.length > 0}
                onChange={(e) => selectAllOrders(e.target.checked)}
              >
                全选
              </Checkbox>
            }
          >
            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
            ) : pendingOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>暂无待处理工单</p>
            ) : (
              <List
                size="small"
                dataSource={pendingOrders}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleOrderSelect(item.id)}
                  >
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Checkbox 
                        checked={selectedOrders.includes(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{item.cabinet?.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{item.order_no}</div>
                      </div>
                      <Space size={4}>
                        <Tag color={getTypeInfo(item.type).color} style={{ fontSize: 11 }}>
                          {getTypeInfo(item.type).text}
                        </Tag>
                        <Tag color={getPriorityInfo(item.priority).color} style={{ fontSize: 11 }}>
                          {getPriorityInfo(item.priority).text}
                        </Tag>
                      </Space>
                    </div>
                  </List.Item>
                )}
              />
            )}
            <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              已选择 {selectedOrders.length} 个工单（不选则默认全部）
            </p>
          </Card>
        </Col>
      </Row>

      {pathResult && pathResult.points.length > 0 && (
        <Card title="详细路径顺序" style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            {pathResult.points.map((point, index) => (
              <Col span={12} key={point.order_id}>
                <div className="path-point">
                  <div className="path-point-number">{index + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {point.cabinet_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      {point.address}
                    </div>
                    <Space size={8}>
                      <Tag color={getTypeInfo(point.type).color}>
                        {getTypeInfo(point.type).text}
                      </Tag>
                      <Tag color={getPriorityInfo(point.priority).color}>
                        {getPriorityInfo(point.priority).text}
                      </Tag>
                      <span style={{ fontSize: 12, color: '#999' }}>
                        <EnvironmentOutlined /> {point.distance}km
                      </span>
                      <span style={{ fontSize: 12, color: '#999' }}>
                        <ClockCircleOutlined /> {point.estimated_time}分钟
                      </span>
                    </Space>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  )
}

export default PathPage
