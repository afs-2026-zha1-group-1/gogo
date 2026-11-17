import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import Icon from '../Icons'
import { useAuth } from '../features/auth/AuthProvider'
import type { GreetingResponse } from '../types'

export default function Home() {
  const { account } = useAuth()
  const [greeting, setGreeting] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    api<GreetingResponse>('/api/greeting')
      .then((result) => {
        if (!result.ok || !result.data) throw new Error('request failed')
        setGreeting(result.data.message)
      })
      .catch((cause: unknown) => setError(`Failed to load the greeting: ${errorMessage(cause)}`))
  }, [])

  return (
    <div className="screen">
      <header className="appbar">
        <div className="logo"><Icon name="branch" /></div>
        <div className="grow">
          <div className="title">我的行程</div>
          <div className="sub">你好，{account?.name ?? '旅行者'}</div>
        </div>
      </header>
      <div className="body">
        <section className="hero">
          <div className="htop">
            <Icon name="sparkle" className="sm" />
            GOGO · 一起旅行
          </div>
          <h1>一起出发</h1>
          <div className="hdest">
            <Icon name="pin" className="sm" />
            创建行程，邀请朋友加入同一个共享空间
          </div>
        </section>

        <div className="sec-title"><Icon name="info" className="sm" /> 服务状态</div>
        <section className="card pad">
          {error ? (
            <p role="alert" className="error">{error}</p>
          ) : (
            <>
              <div className="valid-item">
                <span className="valid-ic brand"><Icon name="check" className="sm" /></span>
                <div>
                  <div className="vt">后端连接正常</div>
                  <div className="vd">{greeting || '正在读取问候语…'}</div>
                </div>
              </div>
              <p className="help">
                收到邀请链接的朋友会直接打开加入页；接受邀请后才看到完整行程与成员。
              </p>
            </>
          )}
        </section>
      </div>
      <div className="actionbar">
        <a className="btn btn-primary" href="#/create">
          <Icon name="plus" className="sm" />
          创建行程
        </a>
      </div>
    </div>
  )
}
