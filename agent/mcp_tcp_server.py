# mcp_tcp_server.py - 修复结构完整的MCP TCP服务器
import asyncio
import json
import sys
import traceback
from typing import Dict, Any, List
from datetime import datetime
import requests
import math
import re
import os
import psutil
import subprocess


class MCPTCPServer:
    """真正的MCP TCP服务器"""

    def __init__(self, host='127.0.0.1', port=8000):
        self.host = host
        self.port = port
        self.clients = set()
        self.server = None
        self.tools = self._register_tools()

    # ========== 工具实现函数（必须在 _register_tools 之前定义） ==========

    def get_weather_impl(self, args):
        """获取天气信息 - 修复编码版本"""
        location = args.get("location", "北京")
        try:
            # 使用最简单的格式，避免乱码
            url = f"https://wttr.in/{location}?format=2"
            response = requests.get(url, timeout=5)
            response.encoding = 'utf-8'
            weather_text = response.text.strip()

            # 清理文本，移除特殊字符
            clean_text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s:℃°C\-]', '', weather_text)

            return f"{location}天气: {clean_text}"
        except Exception as e:
            return f"无法获取{location}天气: {str(e)[:50]}"

    def calculate_impl(self, args):
        """修复版计算函数，支持中文自然语言表达式"""
        expression = args.get("expression", "").strip()
        original_expr = expression

        try:
            # 第一步：清理自然语言疑问词
            import re

            # 移除常见疑问词和语气词
            question_words = ["是多少", "等于多少", "等于几", "等于什么",
                              "怎么算", "如何计算", "求", "请问", "算一下",
                              "告诉我", "请计算", "计算结果", "答案", "结果"]

            clean_expr = expression
            for word in question_words:
                clean_expr = clean_expr.replace(word, "")

            # 第二步：标准化中文数学表达
            # 将"2的3次方"转换为"2**3"的形式
            patterns_to_convert = [
                (r'(\d+)(?:的)?(\d+)次方', r'\1**\2'),  # 处理"2的3次方"
                (r'(\d+)的平方', r'\1**2'),  # 处理"3的平方"
                (r'(\d+)的立方', r'\1**3'),  # 处理"3的立方"
            ]

            for pattern, replacement in patterns_to_convert:
                clean_expr = re.sub(pattern, replacement, clean_expr)

            # 第三步：转换中文运算符
            operator_map = {
                "加": "+", "减": "-", "乘": "*", "乘以": "*",
                "除": "/", "除以": "/", "等于": "=", "的": "",
            }

            for ch, op in operator_map.items():
                clean_expr = clean_expr.replace(ch, op)

            # 第四步：提取纯数学表达式
            # 只保留数字、运算符、括号、小数点和字母（用于函数名）
            math_chars = r'[0-9\.\+\-\*/\(\)\^a-zA-Z\s]'
            math_expr = ''.join(re.findall(math_chars, clean_expr))
            math_expr = math_expr.strip()

            # 如果表达式为空，尝试提取最简单的数字运算
            if not math_expr:
                # 尝试匹配"数字 运算符 数字"模式
                match = re.search(r'(\d+)([加减乘除以])(\d+)', expression)
                if match:
                    num1, op, num2 = match.groups()
                    op_map = {"加": "+", "减": "-", "乘": "*", "除以": "/"}
                    math_expr = f"{num1}{op_map.get(op, op)}{num2}"
                else:
                    return f"无法从'{expression}'中提取有效的数学表达式"

            # 第五步：安全计算
            import math
            allowed_names = {
                '__builtins__': {},
                'math': math,
                'abs': abs, 'round': round, 'pow': pow,
                'max': max, 'min': min, 'sum': sum,
                'sqrt': math.sqrt, 'sin': math.sin, 'cos': math.cos,
                'tan': math.tan, 'log': math.log, 'log10': math.log10,
                'pi': math.pi, 'e': math.e, 'factorial': math.factorial,
            }

            result = eval(math_expr, allowed_names)

            # 格式化输出
            if "**" in math_expr:
                base, exp = math_expr.split("**")
                return f"{original_expr} = {base}的{exp}次方 = {result}"
            else:
                return f"{original_expr} = {result}"

        except SyntaxError as e:
            return f"表达式语法错误。请尝试简化表达，如'2的3次方'或'5+3'"
        except ZeroDivisionError:
            return "数学错误：除数不能为零"
        except Exception as e:
            return f"计算错误：{str(e)}"

    def get_time_impl(self, args):
        return f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    def system_info_impl(self, args):
        try:
            cpu = psutil.cpu_percent(interval=0.5)
            mem = psutil.virtual_memory()
            return f"CPU: {cpu}%, 内存: {mem.percent}%"
        except Exception as e:
            return f"获取系统信息失败: {str(e)}"

    def list_files_impl(self, args):
        path = args.get("path", ".")
        try:
            files = os.listdir(path)
            result = [f"路径: {path}"]
            for f in files[:10]:
                if os.path.isdir(os.path.join(path, f)):
                    result.append(f"  [目录] {f}/")
                else:
                    result.append(f"  [文件] {f}")
            return "\n".join(result)
        except Exception as e:
            return f"列出文件失败: {str(e)}"

    def what_can_you_do_impl(self, args):
        result = ["MCP服务器功能:"]
        for name, info in self.tools.items():
            result.append(f"  {name}: {info['description']}")
        return "\n".join(result)

    # ========== 工具注册 ==========

    def _register_tools(self):
        """注册所有工具"""
        return {
            "get_weather": {
                "description": "获取天气信息",
                "parameters": {"location": "string"},
                "handler": self.get_weather_impl
            },
            "calculate": {
                "description": "计算数学表达式",
                "parameters": {"expression": "string"},
                "handler": self.calculate_impl
            },
            "get_time": {
                "description": "获取当前时间",
                "parameters": {},
                "handler": self.get_time_impl
            },
            "system_info": {
                "description": "获取系统信息",
                "parameters": {},
                "handler": self.system_info_impl
            },
            "list_files": {
                "description": "列出目录文件",
                "parameters": {"path": "string"},
                "handler": self.list_files_impl
            },
            "what_can_you_do": {
                "description": "查看助手功能",
                "parameters": {},
                "handler": self.what_can_you_do_impl
            }
        }

    # ========== 服务器核心逻辑 ==========

    async def handle_client(self, reader, writer):
        """处理客户端连接"""
        client_addr = writer.get_extra_info('peername')
        print(f"新的MCP客户端连接: {client_addr}")
        self.clients.add(writer)

        try:
            while True:
                # 读取数据
                data = await reader.read(4096)
                if not data:
                    break

                # 解析MCP请求
                try:
                    request = json.loads(data.decode('utf-8'))
                    response = await self.process_mcp_request(request)

                    # 发送响应
                    writer.write(json.dumps(response).encode('utf-8'))
                    await writer.drain()

                except json.JSONDecodeError as e:
                    error_response = {
                        "jsonrpc": "2.0",
                        "error": {"code": -32700, "message": f"JSON解析错误: {str(e)}"},
                        "id": None
                    }
                    writer.write(json.dumps(error_response).encode('utf-8'))
                    await writer.drain()

        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"客户端 {client_addr} 处理错误: {e}")
        finally:
            self.clients.remove(writer)
            writer.close()
            await writer.wait_closed()
            print(f"客户端 {client_addr} 断开连接")

    async def process_mcp_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """处理MCP协议请求"""
        method = request.get("method")
        request_id = request.get("id")

        if method == "initialize":
            # 初始化响应
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": "1.0.0",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "mcp-tcp-server",
                        "version": "1.0.0"
                    }
                }
            }

        elif method == "tools/list":
            # 工具列表响应
            tools_list = []
            for name, info in self.tools.items():
                tools_list.append({
                    "name": name,
                    "description": info["description"],
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            param: {"type": "string"}
                            for param in info["parameters"].keys()
                        }
                    }
                })

            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {"tools": tools_list}
            }

        elif method == "tools/call":
            # 工具调用
            params = request.get("params", {})
            tool_name = params.get("name")
            arguments = params.get("arguments", {})

            if tool_name in self.tools:
                # 执行工具
                result = self.tools[tool_name]["handler"](arguments)

                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "content": [{
                            "type": "text",
                            "text": result
                        }]
                    }
                }
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"工具不存在: {tool_name}"
                    }
                }

        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"方法不存在: {method}"
                }
            }

    async def start(self):
        """启动TCP服务器"""
        self.server = await asyncio.start_server(
            self.handle_client,
            self.host,
            self.port
        )

        print(f"MCP TCP服务器已启动，监听 {self.host}:{self.port}")
        print("可用工具:")
        for name, info in self.tools.items():
            print(f"  - {name}: {info['description']}")

        async with self.server:
            await self.server.serve_forever()


async def main():
    """主函数"""
    server = MCPTCPServer(port=8000)
    try:
        await server.start()
    except KeyboardInterrupt:
        print("服务器被用户中断")
    except Exception as e:
        print(f"服务器错误: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())