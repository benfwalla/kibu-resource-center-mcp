var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initialize } from './initialize.js';
import { createSearchTool } from './search.js';
import { createTools } from './tools/index.js';
import { HttpServerTransport } from './http.js';

// Environment variables
const PORT = process.env.PORT || 3000;
const USE_STDIO = process.env.USE_STDIO !== 'false'; // Enable stdio by default
const USE_HTTP = process.env.USE_HTTP !== 'false';   // Enable HTTP by default
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const server = initialize();
        const existingTools = new Set();
        
        // Initialize tools
        yield createSearchTool(server);
        yield createTools(server, existingTools);
        
        // Connect transports based on configuration
        if (USE_STDIO) {
            const stdioTransport = new StdioServerTransport();
            yield server.connect(stdioTransport);
            console.error('MCP Server running on stdio');
        }
        
        if (USE_HTTP) {
            const httpTransport = new HttpServerTransport(PORT);
            yield server.connect(httpTransport);
        }
        
        // If no transport is enabled, show warning
        if (!USE_STDIO && !USE_HTTP) {
            console.error('Warning: No transport enabled. Set USE_STDIO=true or USE_HTTP=true');
            process.exit(1);
        }
    });
}
main().catch((error) => {
    console.error('Fatal error in trying to initialize MCP server: ', error);
    process.exit(1);
});
