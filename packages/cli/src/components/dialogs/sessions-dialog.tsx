import type { InferResponseType } from "hono";
import { apiClient } from "../../lib/api-client";
import { useCallback, useEffect, useState } from "react";
import { useDialog } from "../providers/dialog";
import { useNavigate } from "react-router";
import { useToast } from "../providers/toast";
import { getErrorMessage } from "../../lib/http-errors";
import { TextAttributes } from "@opentui/core";
import { DialogSearchList } from "../dialog-search-list";
import { format } from 'date-fns'

type Session = InferResponseType<(typeof apiClient.sessions)["$get"], 200>[number]


export const SessionsDialogContent = () => {
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    const { close } = useDialog()

    const navigate = useNavigate()
    const { show } = useToast()

    useEffect(() => {
        let ignore = false

        const fetchSessions = async () => {
            try {
                const res = await apiClient.sessions.$get()
                if (!res.ok) {
                    throw new Error(await getErrorMessage(res))
                }

                const data = await res.json()

                if (!ignore) {
                    setSessions(data)
                    setLoading(false)
                }
            } catch (error) {
                if (!ignore) {
                    setLoading(false)
                    show({
                        variant: 'error',
                        message: error instanceof Error ? error.message : "Failed to fetch sessions"
                    })
                    close()
                }
            }
        }
        fetchSessions()

        return () => {
            ignore = true
        }


    }, [close, show])

    const handleSelect = useCallback((session: Session) => {
        close()
        navigate(`/sessions/${session.id}`)
    }, [navigate, close])


    if (loading) {
        return (
            <box flexDirection="column">
                <text attributes={TextAttributes.DIM}>loading sessions...</text>
            </box>
        )
    }

    return (
        <DialogSearchList
            items={sessions}
            onSelect={handleSelect}
            onHighlight={() => { }}
            filterFn={(s, query) => s.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
            renderItem={(s, isSelected) => <>
                <text selectable={false} fg={isSelected ? "black" : "white"}>
                    {s.title}
                </text>
                <box flexGrow={1} />
                <text
                    selectable={false}
                    fg={isSelected ? "black" : undefined}
                    attributes={TextAttributes.DIM}
                >
                    {format(new Date(s.createdAt), "hh:mm a")}
                </text>
            </>
            }
            getKey={(s) => s.id}
            placeholder="Search sessions"
            emptyText="no matching sessions"
        />
    )
}