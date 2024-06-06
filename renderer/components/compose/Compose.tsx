import { Container, Header, Content, FlexboxGrid, Button, Dropdown, Avatar } from 'rsuite'
import { Icon } from '@rsuite/icons'
import { BsX } from 'react-icons/bs'
import { useEffect, useState } from 'react'
import generator, { MegalodonInterface } from 'megalodon'

import { USER_AGENT } from '@/defaults'
import { Server, ServerSet } from '@/entities/server'
import { Account } from '@/entities/account'
import failoverImg from '@/utils/failoverImg'
import Status from './Status'
import { FormattedMessage } from 'react-intl'
import { listAccounts, setUsualAccount } from '@/utils/storage'

export const renderAccountIcon = (props: any, ref: any, account: [Account, Server] | undefined) => {
  if (account && account.length > 0) {
    return (
      <FlexboxGrid {...props} ref={ref} align="middle">
        <FlexboxGrid.Item style={{ marginLeft: '12px' }}>
          <Avatar src={failoverImg(account[0].avatar)} alt={account[0].username} size="sm" circle />
        </FlexboxGrid.Item>
        <FlexboxGrid.Item style={{ paddingLeft: '12px' }}>
          @{account[0].username}@{account[1].domain}
        </FlexboxGrid.Item>
      </FlexboxGrid>
    )
  } else {
    return (
      <FlexboxGrid {...props} ref={ref} align="middle">
        <FlexboxGrid.Item>
          <Avatar src={failoverImg('')} />
        </FlexboxGrid.Item>
        <FlexboxGrid.Item>undefined</FlexboxGrid.Item>
      </FlexboxGrid>
    )
  }
}

type Props = {
  setOpened: (value: boolean) => void
  servers: Array<ServerSet>
}

const Compose: React.FC<Props> = props => {
  const [accounts, setAccounts] = useState<Array<[Account, Server]>>([])
  const [fromAccount, setFromAccount] = useState<[Account, Server]>()
  const [defaultVisibility, setDefaultVisibility] = useState<'public' | 'unlisted' | 'private' | 'direct'>('public')
  const [defaultNSFW, setDefaultNSFW] = useState(false)
  const [defaultLanguage, setDefaultLanguage] = useState<string | null>(null)
  const [client, setClient] = useState<MegalodonInterface>()

  useEffect(() => {
    const f = async () => {
      const accounts = await listAccounts()
      setAccounts(accounts)

      const usual = accounts.find(([a, _]) => a.usual)
      if (usual) {
        setFromAccount(usual)
      } else {
        setFromAccount(accounts[0])
      }
    }
    f()
  }, [props.servers])

  useEffect(() => {
    if (!fromAccount || fromAccount.length < 2) {
      return
    }
    const client = generator(fromAccount[1].sns, fromAccount[1].base_url, fromAccount[0].access_token, USER_AGENT)
    setClient(client)
    const f = async () => {
      const res = await client.verifyAccountCredentials()
      if (res.data.source) {
        setDefaultVisibility(res.data.source.privacy as 'public' | 'unlisted' | 'private' | 'direct')
        setDefaultNSFW(res.data.source.sensitive)
        setDefaultLanguage(res.data.source.language)
      }
    }
    f()
  }, [fromAccount])

  const selectAccount = async (eventKey: string) => {
    const account = accounts[parseInt(eventKey)]
    setFromAccount(account)
    await setUsualAccount({ id: account[0].id })
  }

  return (
    <Container style={{ backgroundColor: 'var(--rs-border-secondary)', overflowY: 'auto' }}>
      <Header style={{ borderBottom: '1px solid var(--rs-divider-border)', backgroundColor: 'var(--rs-state-hover-bg)', cursor: 'move' }} className='draggable'>
        <FlexboxGrid justify="space-between" align="middle">
          <FlexboxGrid.Item style={{ paddingLeft: '12px' }}>
            <FormattedMessage id="compose.title" />
          </FlexboxGrid.Item>
          <FlexboxGrid.Item>
            <Button appearance="link" onClick={() => props.setOpened(false)}>
              <Icon as={BsX} style={{ fontSize: '1.4em' }} />
            </Button>
          </FlexboxGrid.Item>
        </FlexboxGrid>
      </Header>
      <Content style={{ height: '100%', margin: '12px', backgroundColor: 'var(--rs-border-secondary)' }}>
        <FlexboxGrid style={{ marginBottom: '12px' }}>
          <FlexboxGrid.Item>
            <Dropdown renderToggle={(props, ref) => renderAccountIcon(props, ref, fromAccount)} onSelect={selectAccount}>
              {accounts.map((account, index) => (
                <Dropdown.Item eventKey={index} key={index}>
                  @{account[0].username}@{account[1].domain}
                </Dropdown.Item>
              ))}
            </Dropdown>
          </FlexboxGrid.Item>
        </FlexboxGrid>
        {fromAccount && (
          <Status
            client={client}
            server={fromAccount[1]}
            account={fromAccount[0]}
            defaultVisibility={defaultVisibility}
            defaultNSFW={defaultNSFW}
            defaultLanguage={defaultLanguage}
            setOpened={props.setOpened}
          />
        )}
      </Content>
    </Container>
  )
}

export default Compose
