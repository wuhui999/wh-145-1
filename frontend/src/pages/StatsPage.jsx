import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  List, 
  Tag, 
  Spin, 
  message,
  Table
} from 'antd'
import { 
  ThunderboltOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer
} from 'recharts'
import { statsAPI, batteryAPI, workOrderAPI } from '../services/api'

const StatsPage = () => {
  const [overview, setOverview] = useState(null)
  const [faultRate, setFaultRate] = useState(null)
  const [scrapWarning, setScrapWarning] = useState(null)
  const [swapEfficiency, setSwapEfficiency] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllStats()
  }, [])

  const loadAllStats = async () => {
    setLoading(true)
    try {
      const [overviewData, faultData, scrapData, efficiencyData] = await Promise.all([
        statsAPI.overview(),
        statsAPI.faultRate(),
        statsAPI.scrapWarning(),
        statsAPI.swapEfficiency()
      ])
      setOverview(overviewData)
      setFaultRate(faultData)
      setScrapWarning(scrapData)
      setSwapEfficiency(efficiencyData)
    } catch (error) {
      message.error('加载统计数据失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const PIE_COLORS = ['#52c41a', '#faad14', '#ff4d4f', '#1890ff', '#722ed1']

  const healthDistributionData = [
    { name: '优秀(80-100)', value: 45 },
    { name: '良好(60-80)', value: 30 },
    { name: '一般(40-60)', value: 15 },
    { name: '较差(0-40)', value: 10 }
  ]

  const orderTypeData = [
    { name: '低电量', value: 45, color: '#faad14' },
    { name: '故障', value: 30, color: '#ff4d4f' },
    { name: '投诉', value: 25, color: '#722ed1' }
  ]

  const swapTrendData = swapEfficiency?.last_7_days?.map(d => ({
    date: d.date?.slice(5) || '',
    换电次数: d.count
  })) || []

  const scrapColumns = [
    {
      title: '电池编号',
      dataIndex: 'battery_no',
      key: 'battery_no',
      width: 120
    },
    {
      title: '健康分',
      dataIndex: 'health_score',
      key: 'health_score',
      width: 120,
      render: (val) => (
        <Progress 
          percent={Math.round(val)} 
          size="small" 
          strokeColor={val < 50 ? '#ff4d4f' : val < 60 ? '#faad14' : '#52c41a'}
        />
      )
    },
    {
      title: '循环次数',
      dataIndex: 'cycle_count',
      key: 'cycle_count',
      width: 100,
      render: (val) => `${val} 次`
    },
    {
      title: '预警等级',
      dataIndex: 'warning_level',
      key: 'warning_level',
      width: 100,
      render: (level) => {
        const colorMap = { high: 'red', medium: 'orange', low: 'blue' }
        const textMap = { high: '高危', medium: '中危', low: '低危' }
        return <Tag color={colorMap[level]}>{textMap[level]}</Tag>
      }
    }
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="page-title">数据统计</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="总柜机数" 
              value={overview?.total_cabinets || 0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <p style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
              在线 {overview?.online_cabinets || 0} 台
            </p>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="电池总数" 
              value={overview?.total_batteries || 0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              平均健康分: <span style={{ color: overview?.avg_health_score >= 60 ? '#52c41a' : '#ff4d4f' }}>
                {overview?.avg_health_score || 0}
              </span>
            </p>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="今日换电" 
              value={overview?.today_swaps || 0}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              日均 {swapEfficiency?.daily_average || 0} 次
            </p>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="待处理工单" 
              value={overview?.pending_orders || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <p style={{ marginTop: 8, fontSize: 12, color: '#ff4d4f' }}>
              报废预警 {scrapWarning?.total_warning || 0} 块
            </p>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="换电效率趋势" style={{ marginBottom: 16 }}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={swapTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="换电次数" 
                    stroke="#1890ff" 
                    strokeWidth={2}
                    dot={{ fill: '#1890ff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="故障率统计">
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Progress 
                    type="dashboard"
                    percent={faultRate?.slot_fault_rate || 0}
                    strokeColor={{ '0%': '#52c41a', '100%': '#ff4d4f' }}
                  />
                  <p style={{ marginTop: 12, color: '#666' }}>格口故障率</p>
                  <p style={{ fontSize: 12, color: '#999' }}>
                    故障 {faultRate?.fault_slots || 0} / 总计 {faultRate?.total_slots || 0}
                  </p>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Progress 
                    type="dashboard"
                    percent={faultRate?.fault_order_rate || 0}
                    strokeColor={{ '0%': '#52c41a', '100%': '#fa8c16' }}
                  />
                  <p style={{ marginTop: 12, color: '#666' }}>故障工单占比</p>
                  <p style={{ fontSize: 12, color: '#999' }}>
                    故障 {faultRate?.fault_orders || 0} / 总计 {faultRate?.total_orders || 0}
                  </p>
                </div>
              </Col>
            </Row>
            <p style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0', color: '#666', fontSize: 13 }}>
              <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
              平均处理时长：<strong>{swapEfficiency?.avg_completion_hours || 0} 小时</strong>
              {swapEfficiency?.avg_completion_hours > 24 && (
                <Tag color="red" style={{ marginLeft: 8 }}>超时</Tag>
              )}
            </p>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="工单类型分布" style={{ marginBottom: 16 }}>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {orderTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card 
            title="电池报废预警" 
            extra={<Tag color="red">{scrapWarning?.high_warning || 0} 高危</Tag>}
          >
            <div style={{ marginBottom: 16 }}>
              <Row gutter={8}>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                      {scrapWarning?.high_warning || 0}
                    </p>
                    <p style={{ fontSize: 12, color: '#999' }}>高危</p>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                      {scrapWarning?.medium_warning || 0}
                    </p>
                    <p style={{ fontSize: 12, color: '#999' }}>中危</p>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {scrapWarning?.low_warning || 0}
                    </p>
                    <p style={{ fontSize: 12, color: '#999' }}>低危</p>
                  </div>
                </Col>
              </Row>
            </div>

            <Table
              size="small"
              columns={scrapColumns}
              dataSource={scrapWarning?.batteries || []}
              rowKey="battery_no"
              pagination={false}
              scroll={{ y: 300 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default StatsPage
