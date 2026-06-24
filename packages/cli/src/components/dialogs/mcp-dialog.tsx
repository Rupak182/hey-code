import { useCallback, useEffect, useState } from "react";
import { useDialog } from "../providers/dialog";
import { useToast } from "../providers/toast";
import { TextAttributes } from "@opentui/core";
import { DialogSearchList } from "../dialog-search-list";
import { getActiveMcpConnections, type ActiveConnection } from "../../lib/mcp/client";

export const MCPsDialogContent = () => {
    const [connections, setConnections] = useState<ActiveConnection[]>([]);
    const { close } = useDialog();
    const { show } = useToast();

    useEffect(() => {
        setConnections(getActiveMcpConnections());
    }, []);

    const handleSelect = useCallback((conn: ActiveConnection) => {
        close();
        const toolNames = Object.keys(conn.tools || {});
        if (conn.status === "connected") {
            if (toolNames.length > 0) {
                show({
                    variant: 'success',
                    message: `MCP ${conn.config.name}: ${toolNames.join(", ")}`
                });
            } else {
                show({
                    variant: 'info',
                    message: `MCP ${conn.config.name} is connected but has no tools.`
                });
            }
        } else {
            show({
                variant: 'error',
                message: `MCP Server ${conn.config.name} is in status: ${conn.status}`
            });
        }
    }, [close, show]);

    return (
        <DialogSearchList
            items={connections}
            onSelect={handleSelect}
            onHighlight={() => {}}
            filterFn={(conn, query) => conn.config.name.toLowerCase().includes(query.toLowerCase())}
            renderItem={(conn, isSelected) => {
                const statusSymbol = conn.status === "connected" ? "●" : conn.status === "connecting" ? "○" : "▲";
                const statusColor = conn.status === "connected" ? "green" : conn.status === "connecting" ? "yellow" : "red";
                const toolCount = Object.keys(conn.tools || {}).length;
                const transportType = conn.config.type;
                const name = conn.config.name;

                return (
                    <>
                        <text selectable={false} fg={isSelected ? "black" : "white"}>
                            {name} ({transportType})
                        </text>
                        <box flexGrow={1} />
                        <text
                            selectable={false}
                            fg={isSelected ? "black" : statusColor}
                        >
                            {statusSymbol} {conn.status} ({toolCount} tools)
                        </text>
                    </>
                );
            }}
            getKey={(conn) => conn.config.name}
            placeholder="Search MCP servers"
            emptyText="No MCP servers configured"
        />
    );
};
