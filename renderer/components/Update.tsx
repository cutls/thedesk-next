import { useEffect, useState } from 'react'
import { FormattedMessage, } from 'react-intl'
import { Modal, Button } from 'rsuite'
import { open as openBrowser } from '@/utils/openBrowser'

export default ({ version }: { version: string }) => {
    const [newV, setNewV] = useState('')
    const [open, setOpen] = useState(false)
    const handleOpen = () => setOpen(true)
    const handleClose = () => setOpen(false)
    useEffect(() => {
        console.log(version)
        const fn = async () => {
            if (!version) return
            const url = 'http://localhost:4000/ver.next.json'
            const api = await fetch(url)
            const json = await api.json()
            console.log(json.semanticVersion, version)
            setNewV(json.version)
            if (json.semanticVersion !== version) handleOpen()
        }
        fn()
    }, [version])
    const update = () => {
        handleClose()
        openBrowser('https://thedesk.top')
    }

    return (
        <>
            <Modal backdrop="static" keyboard={false} open={open} onClose={handleClose}>
                <Modal.Header>
                    <Modal.Title>
                        <FormattedMessage id="update.available" />
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <FormattedMessage id="update.update" values={{ version: newV }} />
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={update} appearance="primary">
                        Ok
                    </Button>
                    <Button onClick={handleClose} appearance="subtle">
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
