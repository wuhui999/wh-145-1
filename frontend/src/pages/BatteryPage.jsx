import React, { useState, useEffect } from 'react'
import { 
  Table, 
  Input, 
  Select, 
  Button, 
  Space, 
  Modal, 
  Descriptions, 
  Timeline,
  Tag,
  Spin,
  message,
  Row,
  Col,
  Card,
  Progress
} from 'antd'
import { SearchOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { batteryAPI } from '../services/api'
import dayjs from 'dayjs'

const { Option } = Select

const BatteryPage = () => {
  const [batteries, setBatteries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBattery, setSelectedBattery] = useState(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
    healthRange: ''
  })

  useEffect(() => {
    loadBatteries()
  }, [filters])

  const loadBatteries = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.healthRange === 'low') {
        params.health_max = 60
      } else if (filters.healthRange === 'medium') {
        params.health_min = 60
        params.health_max = 80
      } else if (filters.healthRange === 'high') {
        params.health_min = 80
      }
      
      let data = await batteryAPI.list(params)
      
      if (filters.keyword) {
        data = data.filter(b => 
          b.battery_no.toLowerCase().includes(filters.keyword.toLowerCase()) ||
          b.model?.toLowerCase().includes(filters.keyword.toLowerCase())
        )
      }
      
      setBatteries(data)
    } catch (error) {
      message.error('加载电池列表失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (id) => {
    setDetailVisible(true)
    setDetailLoading(true)
    try {
      const data = await batteryAPI.get(id)
      setSelectedBattery(data)
    } catch (error) {
      message.error('加载电池详情失败')
      console.error(error)
    } finally {
      setDetailLoading(false)
    }
  }

  const getHealthColor = (score) => {
    if (score >= 80) return '#52c41a'
    if (score >= 60) return '#faad14'
    return '#ff4d4f'
  }

  const getStatusText = (status) => {
    const map = {
      in_use: { text: '使用中', color: 'green' },
      charging: { text: '充电中', color: 'blue' },
      maintenance: { text: '维护中', color: 'orange' },
      scrapped: { text: '已报废', color: 'default' }
    }
    return map[status] || { text: status, color: 'default' }
  }

  const columns = [
    {
      title: '电池编号',
      dataIndex: 'battery_no',
      key: 'battery_no',
      width: 120,
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 120
    },
    {
      title: '容量',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 80,
      render: (val) => `${val}Ah`
    },
    {
      title: '当前电量',
      dataIndex: 'current_soc',
      key: 'current_soc',
      width: 150,
      render: (val) => (
        <Progress 
          percent={Math.round(val)} 
          size="small"
          strokeColor={getHealthColor(val)}
        />
      )
    },
    {
      title: '循环次数',
      dataIndex: 'cycle_count',
      key: 'cycle_count',
      width: 100,
      render: (val) => <span>{val} 次</span>
    },
    {
      title: '健康分',
      dataIndex: 'health_score',
      key: 'health_score',
      width: 150,
      render: (val) => (
        <Progress 
          percent={Math.round(val)} 
          size="small"
          strokeColor={getHealthColor(val)}
          format={(percent) => <span style={{ color: getHealthColor(val) }}>{percent}分</span>}
        />
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const info = getStatusText(status)
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" onClick={() => handleViewDetail(record.id)}>
          详情
        </Button>
      )
    }
  ]

  return (
    <div>
      <h2 className="page-title">电池档案</h2>
      
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder="搜索电池编号/型号"
              prefix={<SearchOutlined />}
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              allowClear
            />
          </Col>
          <Col span={5}>
            <Select 
              placeholder="状态筛选" 
              style={{ width: '100%' }}
              value={filters.status || undefined}
              onChange={(val) => setFilters({ ...filters, status: val || '' })}
              allowClear
            >
              <Option value="in_use">使用中</Option>
              <Option value="charging">充电中</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="scrapped">已报废</Option>
            </Select>
          </Col>
          <Col span={5}>
            <Select 
              placeholder="健康分区间" 
              style={{ width: '100%' }}
              value={filters.healthRange || undefined}
              onChange={(val) => setFilters({ ...filters, healthRange: val || '' })}
              allowClear
            >
              <Option value="high">80分以上</Option>
              <Option value="medium">60-80分</Option>
              <Option value="low">60分以下</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadBatteries}
            >
              刷新
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table 
          columns={columns} 
          dataSource={batteries} 
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ y: 500 }}
        />
      </Card>

      <Modal
        title="电池详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : selectedBattery ? (
          <div>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="电池编号">{selectedBattery.battery_no}</Descriptions.Item>
              <Descriptions.Item label="型号">{selectedBattery.model}</Descriptions.Item>
              <Descriptions.Item label="容量">{selectedBattery.capacity}Ah</Descriptions.Item>
              <Descriptions.Item label="当前电量">
                <span style={{ color: getHealthColor(selectedBattery.current_soc) }}>
                  {selectedBattery.current_soc.toFixed(1)}%
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="循环次数">{selectedBattery.cycle_count} 次</Descriptions.Item>
              <Descriptions.Item label="健康分">
                <span style={{ color: getHealthColor(selectedBattery.health_score), fontWeight: 'bold' }}>
                  {selectedBattery.health_score.toFixed(1)} 分
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusText(selectedBattery.status).color}>
                  {getStatusText(selectedBattery.status).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="出厂日期">
                {dayjs(selectedBattery.manufacture_date).format('YYYY-MM-DD')}
              </Descriptions.Item>
            </Descriptions>

            <h4 style={{ marginTop: 20, marginBottom: 12 }}>维修记录</h4>
            {selectedBattery.maintenance_records?.length > 0 ? (
              <Timeline
                items={selectedBattery.maintenance_records.map(r => ({
                  color: r.type === 'repair' ? 'red' : r.type === 'calibration' ? 'blue' : 'green',
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>{r.type}</div>
                      <div style={{ color: '#666', fontSize: 12 }}>{r.description}</div>
                      <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                        {dayjs(r.date).format('YYYY-MM-DD')} · {r.operator}
                      </div>
                    </div>
                  )
                }))}
              />
            ) : (
              <p style={{ color: '#999', textAlign: 'center' }}>暂无维修记录</p>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default BatteryPage
