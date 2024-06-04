import { useState, useEffect, useReducer, CSSProperties, useRef, useCallback, useContext } from 'react'
import { Container, Content, useToaster, Animation, DOMHelper } from 'rsuite'
import dayjs from 'dayjs'

import { Server, ServerSet } from '@/entities/server'
import { Timeline } from '@/entities/timeline'
import { Unread } from '@/entities/unread'
import alert from '@/components/utils/alert'
import NewTimeline from '@/components/timelines/New'
import ShowTimeline from '@/components/timelines/Show'
import NewServer from '@/components/servers/New'
import Navigator from '@/components/Navigator'
import Compose from '@/components/compose/Compose'
import Media from '@/components/Media'
import generateNotification from '@/utils/notification'
import { ReceiveNotificationPayload } from '@/payload'
import { Entity, MegalodonInterface } from 'megalodon'
import Thirdparty from '@/components/settings/Thirdparty'
import { Settings } from '@/entities/settings'
import SettingsPage from '@/components/settings/Settings'
import Detail from '@/components/detail/Detail'
import { Account } from '@/entities/account'
import Report from '@/components/report/Report'
import FromOtherAccount from '@/components/fromOtherAccount/FromOtherAccount'
import Announcements from '@/components/announcements/Announcements'
import ListMemberships from '@/components/listMemberships/ListMemberships'
import AddListMember from '@/components/addListMember/AddListMember'
import { useIntl } from 'react-intl'
import { Context as i18nContext } from '@/i18n'
import { StreamingContext } from '@/streaming'
import Search from '@/components/search/Search'
import { listServers, listTimelines, readSettings } from 'utils/storage'

const { scrollLeft } = DOMHelper

function App() {
  const { formatMessage } = useIntl()
  const { start, latestTimelineRefreshed } = useContext(StreamingContext)

  const [servers, setServers] = useState<Array<ServerSet>>([])
  const [timelines, setTimelines] = useState<Array<[Timeline, Server]>>([])
  const [unreads, setUnreads] = useState<Array<Unread>>([])
  const [composeOpened, setComposeOpened] = useState<boolean>(false)
  const [searchOpened, setSearchOpened] = useState<boolean>(false)
  const [style, setStyle] = useState<CSSProperties>({})
  const [highlighted, setHighlighted] = useState<Timeline | null>(null)

  const [modalState, dispatch] = useReducer(modalReducer, initialModalState)
  const spaceRef = useRef<HTMLDivElement>()

  const toaster = useToaster()
  const { switchLang } = useContext(i18nContext)

  const loadTimelines = async () => {
    stop()
    const timelines = await listTimelines()
    setTimelines(timelines)
    console.log('start')
    start()
  }

  useEffect(() => {
    loadAppearance()
    document.addEventListener('keydown', handleKeyPress)

    listServers().then(res => {
      if (res.length === 0) {
        console.debug('There is no server')
        dispatch({ target: 'newServer', value: true })
        toaster.push(alert('info', formatMessage({ id: 'alert.no_server' })), { placement: 'topCenter' })
      } else {
        setServers(
          res.map(r => ({
            server: r[0],
            account: r[1]
          }))
        )
      }
    })

    loadTimelines()

    /*
    listen('updated-servers', async () => {
      const res = await invoke<Array<[Server, Account | null]>>('list_servers')
      setServers(
        res.map(r => ({
          server: r[0],
          account: r[1]
        }))
      )
    })
    */


    // Push Notification

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [])
  useEffect(() => {
    loadTimelines()
  }, [latestTimelineRefreshed])

  useEffect(() => {
    if (!highlighted) return
    if (!spaceRef.current) return
    const node = document.getElementById(highlighted.id.toString())
    if (node) {
      scrollLeft(spaceRef.current, node.offsetLeft)
    } else {
      // Retry to scroll
      setTimeout(() => {
        const node = document.getElementById(highlighted.id.toString())
        if (node) {
          scrollLeft(spaceRef.current, node.offsetLeft)
        }
      }, 500)
    }
  }, [highlighted])

  const handleKeyPress = useCallback(async (event: KeyboardEvent) => {
    if (event.key === 'F12') {
      //await invoke('switch_devtools')
    }
  }, [])

  const loadAppearance = () => {
    readSettings().then(res => {
      setStyle({
        fontSize: res.appearance.font_size
      })
      switchLang(res.appearance.language)
      dayjs.locale(res.appearance.language)
      document.documentElement.setAttribute('lang', res.appearance.language)
    })
  }

  const toggleCompose = () => {
    if (servers.find(s => s.account !== null)) {
      setSearchOpened(false)
      setComposeOpened(previous => !previous)
    } else {
      toaster.push(alert('info', formatMessage({ id: 'alert.need_auth' })), { placement: 'topStart' })
    }
  }

  const toggleSearch = () => {
    if (servers.find(s => s.account !== null)) {
      setComposeOpened(false)
      setSearchOpened(previous => !previous)
    } else {
      toaster.push(alert('info', formatMessage({ id: 'alert.need_auth' })), { placement: 'topStart' })
    }
  }

  return (
    <div
      className="container index"
      style={Object.assign({ backgroundColor: 'var(--rs-bg-well)', width: '100%', overflow: 'hidden' }, style)}
    >
      {/** Modals **/}
      <NewServer
        open={modalState.newServer.opened}
        onClose={() => dispatch({ target: 'newServer', value: false, object: null })}
        initialServer={modalState.newServer.object}
      />
      <Media
        index={modalState.media.index}
        media={modalState.media.object}
        opened={modalState.media.opened}
        close={() => dispatch({ target: 'media', value: false, object: [], index: -1 })}
      />
      <Thirdparty open={modalState.thirdparty.opened} onClose={() => dispatch({ target: 'thirdparty', value: false })} />
      <SettingsPage
        open={modalState.settings.opened}
        onClose={() => dispatch({ target: 'settings', value: false })}
        reloadAppearance={loadAppearance}
      />
      <Report
        opened={modalState.report.opened}
        status={modalState.report.object}
        client={modalState.report.client}
        close={() => dispatch({ target: 'report', value: false, object: null, client: null })}
      />
      <FromOtherAccount
        opened={modalState.fromOtherAccount.opened}
        status={modalState.fromOtherAccount.object}
        close={() => dispatch({ target: 'fromOtherAccount', value: false, object: null })}
      />
      {modalState.announcements.object && (
        <Announcements
          account={modalState.announcements.object.account}
          server={modalState.announcements.object.server}
          opened={modalState.announcements.opened}
          close={() => dispatch({ target: 'announcements', value: false, object: null })}
        />
      )}
      <ListMemberships
        opened={modalState.listMemberships.opened}
        list={modalState.listMemberships.object}
        client={modalState.listMemberships.client}
        close={() => dispatch({ target: 'listMemberships', value: false, object: null, client: null })}
      />
      <AddListMember
        opened={modalState.addListMember.opened}
        user={modalState.addListMember.object}
        client={modalState.addListMember.client}
        close={() => dispatch({ target: 'addListMember', value: false, object: null, client: null })}
      />
      {/** Modals **/}

      <Container style={{ height: '100%' }}>
        <Navigator
          servers={servers}
          unreads={unreads}
          addNewServer={() => dispatch({ target: 'newServer', value: true, object: null })}
          openAuthorize={(server: Server) => dispatch({ target: 'newServer', value: true, object: server })}
          openAnnouncements={(server: Server, account: Account) =>
            dispatch({ target: 'announcements', value: true, object: { server, account } })
          }
          openThirdparty={() => dispatch({ target: 'thirdparty', value: true })}
          openSettings={() => dispatch({ target: 'settings', value: true })}
          toggleCompose={toggleCompose}
          toggleSearch={toggleSearch}
          setHighlighted={setHighlighted}
          setUnreads={setUnreads}
        />
        <Animation.Transition
          in={composeOpened}
          exitedClassName="compose-exited"
          exitingClassName="compose-exiting"
          enteredClassName="compose-entered"
          enteringClassName="compose-entering"
        >
          {(props, ref) => (
            <div {...props} ref={ref} style={{ overflow: 'hidden' }}>
              <Compose setOpened={setComposeOpened} servers={servers} />
            </div>
          )}
        </Animation.Transition>
        <Animation.Transition
          in={searchOpened}
          exitedClassName="compose-exited"
          exitingClassName="compose-exiting"
          enteredClassName="compose-entered"
          enteringClassName="compose-entering"
        >
          {(props, ref) => (
            <div {...props} ref={ref} style={{ overflow: 'hidden' }}>
              <Search
                setOpened={setSearchOpened}
                servers={servers}
                openMedia={(media: Array<Entity.Attachment>, index: number) =>
                  dispatch({ target: 'media', value: true, object: media, index: index })
                }
                openReport={(status: Entity.Status, client: MegalodonInterface) =>
                  dispatch({ target: 'report', value: true, object: status, client: client })
                }
                openFromOtherAccount={(status: Entity.Status) => dispatch({ target: 'fromOtherAccount', value: true, object: status })}
              />
            </div>
          )}
        </Animation.Transition>
        <Content className="timeline-space" style={{ display: 'flex', position: 'relative' }} ref={spaceRef}>
          {timelines.map(timeline => (
            <ShowTimeline
              timeline={timeline[0]}
              server={timeline[1]}
              unreads={unreads}
              setUnreads={setUnreads}
              key={timeline[0].id}
              openMedia={(media: Array<Entity.Attachment>, index: number) =>
                dispatch({ target: 'media', value: true, object: media, index: index })
              }
              openReport={(status: Entity.Status, client: MegalodonInterface) =>
                dispatch({ target: 'report', value: true, object: status, client: client })
              }
              openFromOtherAccount={(status: Entity.Status) => dispatch({ target: 'fromOtherAccount', value: true, object: status })}
            />
          ))}
          <NewTimeline servers={servers} />
        </Content>
        <Detail
          dispatch={dispatch}
          openMedia={(media: Array<Entity.Attachment>, index: number) =>
            dispatch({ target: 'media', value: true, object: media, index: index })
          }
          openReport={(status: Entity.Status, client: MegalodonInterface) =>
            dispatch({ target: 'report', value: true, object: status, client: client })
          }
          openFromOtherAccount={(status: Entity.Status) => dispatch({ target: 'fromOtherAccount', value: true, object: status })}
          openListMemberships={(list: Entity.List, client: MegalodonInterface) =>
            dispatch({ target: 'listMemberships', value: true, object: list, client: client })
          }
          openAddListMember={(user: Entity.Account, client: MegalodonInterface) => {
            dispatch({ target: 'addListMember', value: true, object: user, client: client })
          }}
        />
      </Container>
    </div>
  )
}

type ModalState = {
  newServer: {
    opened: boolean
    object: Server | null
  }
  media: {
    opened: boolean
    object: Array<Entity.Attachment>
    index: number
  }
  thirdparty: {
    opened: boolean
  }
  settings: {
    opened: boolean
  }
  report: {
    opened: boolean
    object: Entity.Status | null
    client: MegalodonInterface | null
  }
  fromOtherAccount: {
    opened: boolean
    object: Entity.Status | null
  }
  announcements: {
    opened: boolean
    object: {
      server: Server
      account: Account
    } | null
  }
  listMemberships: {
    opened: boolean
    object: Entity.List | null
    client: MegalodonInterface | null
  }
  addListMember: {
    opened: boolean
    object: Entity.Account | null
    client: MegalodonInterface | null
  }
}

const initialModalState: ModalState = {
  newServer: {
    opened: false,
    object: null
  },
  media: {
    opened: false,
    object: [],
    index: 0
  },
  thirdparty: {
    opened: false
  },
  settings: {
    opened: false
  },
  report: {
    opened: false,
    object: null,
    client: null
  },
  fromOtherAccount: {
    opened: false,
    object: null
  },
  announcements: {
    opened: false,
    object: null
  },
  listMemberships: {
    opened: false,
    object: null,
    client: null
  },
  addListMember: {
    opened: false,
    object: null,
    client: null
  }
}

const modalReducer = (
  current: ModalState,
  action: { target: string; value: boolean; object?: any; index?: number; client?: MegalodonInterface | null }
) => {
  switch (action.target) {
    case 'newServer':
      return { ...current, newServer: { opened: action.value, object: action.object } }
    case 'media':
      return { ...current, media: { opened: action.value, object: action.object, index: action.index } }
    case 'thirdparty':
      return { ...current, thirdparty: { opened: action.value } }
    case 'settings':
      return { ...current, settings: { opened: action.value } }
    case 'report':
      return { ...current, report: { opened: action.value, object: action.object, client: action.client } }
    case 'fromOtherAccount':
      return { ...current, fromOtherAccount: { opened: action.value, object: action.object } }
    case 'announcements':
      return { ...current, announcements: { opened: action.value, object: action.object } }
    case 'listMemberships':
      return { ...current, listMemberships: { opened: action.value, object: action.object, client: action.client } }
    case 'addListMember':
      return { ...current, addListMember: { opened: action.value, object: action.object, client: action.client } }
    default:
      return current
  }
}

export default App
