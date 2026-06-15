import React from 'react'
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd'
import {
  EnvironmentOutlined,
  FileTextOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
  SwapOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const { Header, Sider, Content } = Layout

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const roleNames = {
    admin: '管理员',
    dispatcher: '调度员',
    operator: '运维人员',
    customer_service: '客服'
  }

  const menuItems = [
    { key: '/map', icon: <EnvironmentOutlined />, label: '柜点地图' },
    { key: '/batteries', icon: <ThunderboltOutlined />, label: '电池档案' },
    { key: '/work-orders', icon: <FileTextOutlined />, label: '工单管理' },
    { key: '/path', icon: <SwapOutlined />, label: '路径建议' },
    { key: '/stats', icon: <BarChartOutlined />, label: '数据统计' },
  ]

  const userMenu = {
    items: [
      {
        key: '1',
        icon: <UserOutlined />,
        label: `${user?.full_name} (${roleNames[user?.role] || user?.role})`,
        disabled: true
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: () => {
          logout()
          navigate('/login')
        }
      }
    ]
  }

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">
          <ThunderboltOutlined style={{ fontSize: '24px' }} />
          <span>共享换电柜运营平台</span>
        </div>
        <Dropdown menu={userMenu} placement="bottomRight">
          <div className="user-info" style={{ cursor: 'pointer' }}>
            <span style={{ color: '#666' }}>{user?.full_name}</span>
            <Avatar icon={<UserOutlined />} />
          </div>
        </Dropdown>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Content className="page-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
