# mcp_tcp_client.py - MCP TCP客户端
import asyncio
import json
import sys
import requests
import traceback
from datetime import datetime
from typing import Dict, Any


class MCPTCPClient:
    """MCP TCP客户端"""

    def __init__(self, host='127.0.0.1', port=8000, ollama_url="http://127.0.0.1:11434"):
        self.host = host
        self.port = port
        self.ollama_url = ollama_url
        self.reader = None
        self.writer = None
        self.request_id = 1
        self.tools = []

    async def connect(self):
        """连接到MCP服务器"""
        print(f"连接MCP服务器 {self.host}:{self.port}...")

        try:
            self.reader, self.writer = await asyncio.open_connection(
                self.host, self.port
            )

            # 初始化连接
            await self.initialize()
            print("✅ 已连接到MCP TCP服务器")

            # 获取工具列表
            self.tools = await self.list_tools()
            print(f"🛠️  可用工具: {len(self.tools)}个")

            for tool in self.tools:
                print(f"  - {tool['name']}: {tool['description']}")

            return True

        except ConnectionRefusedError:
            print(f"❌ 连接被拒绝，请确保MCP服务器正在运行")
            return False
        except Exception as e:
            print(f"❌ 连接错误: {e}")
            return False

    async def send_request(self, method: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """发送MCP请求"""
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params or {}
        }

        self.request_id += 1

        # 发送请求
        self.writer.write(json.dumps(request).encode('utf-8'))
        await self.writer.drain()

        # 接收响应
        data = await self.reader.read(4096)
        response = json.loads(data.decode('utf-8'))

        return response

    async def initialize(self):
        """初始化MCP会话"""
        response = await self.send_request("initialize", {
            "protocolVersion": "1.0.0",
            "clientInfo": {
                "name": "mcp-tcp-client",
                "version": "1.0.0"
            },
            "capabilities": {}
        })

        if "error" in response:
            raise Exception(f"初始化失败: {response['error']['message']}")

        return response.get("result", {})

    async def list_tools(self) -> list:
        """获取工具列表"""
        response = await self.send_request("tools/list")

        if "error" in response:
            raise Exception(f"获取工具列表失败: {response['error']['message']}")

        return response.get("result", {}).get("tools", [])

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """调用工具"""
        response = await self.send_request("tools/call", {
            "name": tool_name,
            "arguments": arguments
        })

        if "error" in response:
            raise Exception(f"工具调用失败: {response['error']['message']}")

        # 提取结果文本
        result = response.get("result", {})
        content = result.get("content", [])

        if content and content[0].get("type") == "text":
            return content[0].get("text", "")

        return str(result)

    def ask_ollama(self, prompt: str) -> str:
        """向Ollama发送请求"""
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": "gemma3:4b",
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "max_tokens": 500}
                },
                timeout=30
            )
            return response.json().get("response", "").strip()
        except:
            return "无法连接到Ollama"

    def detect_intent(self, user_input: str):
        """检测用户意图"""
        user_lower = user_input.lower()

        # 天气相关 - 修复版本
        if "天气" in user_input:
            location = "北京"  # 默认值

            # 尝试提取城市名
            if "天气" in user_input:
                # 处理"获取XX天气信息"模式
                import re

                # 模式1: "获取{城市}天气信息"
                pattern1 = r'获取\s*(\S+?)\s*天气'
                # 模式2: "{城市}的天气"
                pattern2 = r'(\S+?)(?:的)?天气'
                # 模式3: "查询{城市}天气"
                pattern3 = r'查询\s*(\S+?)\s*天气'

                match = None
                for pattern in [pattern1, pattern2, pattern3]:
                    match = re.search(pattern, user_input)
                    if match:
                        potential_city = match.group(1).strip()

                        # 过滤掉非城市的词
                        exclude_words = ["获取", "查询", "信息", "今天", "明天", "查看"]
                        if potential_city not in exclude_words and len(potential_city) >= 2:
                            location = potential_city
                            break

            # 如果没提取到，但有常见城市名
            if location == "北京":
                common_cities = ["北京", "上海", "广州", "深圳", "杭州", "南京",
                                 "武汉", "成都", "重庆", "西安", "天津", "苏州"]
                for city in common_cities:
                    if city in user_input:
                        location = city
                        break

            print(f"DEBUG: 检测到城市 '{location}'")  # 调试信息
            return "get_weather", {"location": location}

        # 计算相关
        calc_keywords = ["计算", "算", "加", "减", "乘", "除", "次方", "平方", "立方", "阶乘"]
        if any(keyword in user_input for keyword in calc_keywords):
            return "calculate", {"expression": user_input}

        # 时间相关
        if "时间" in user_input or "几点" in user_input:
            return "get_time", {}

        # 系统信息
        if "系统" in user_input or "cpu" in user_input or "内存" in user_input:
            return "system_info", {}

        # 文件管理
        if "文件" in user_input or "列出" in user_input or "目录" in user_input:
            return "list_files", {"path": "."}

        # 功能查询
        if "你能" in user_input or "功能" in user_input or "帮助" in user_input:
            return "what_can_you_do", {}

        return None, None

    async def chat_loop(self):
        """对话循环"""
        print("\n" + "=" * 50)
        print("🤖 MCP TCP AI助手")
        print("💡 试试: 北京天气、计算3的阶乘、现在几点了")
        print("输入 '退出' 结束对话")
        print("=" * 50)

        while True:
            try:
                # 获取用户输入
                user_input = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: input("\n你: ").strip()
                )

                if user_input.lower() in ["退出", "quit", "exit"]:
                    print("👋 再见！")
                    break

                if not user_input:
                    continue

                # 检测意图
                tool_name, tool_args = self.detect_intent(user_input)

                if tool_name:
                    # 调用MCP工具
                    print(f"🛠️  调用工具: {tool_name}")
                    result = await self.call_tool(tool_name, tool_args)
                    print(f"📊 结果:\n{result}")
                else:
                    # 让AI分析
                    system_prompt = """你是一个AI助手，可以通过工具帮助用户。

当用户需要工具时，请用以下格式调用工具：
TOOL_CALL {"name": "工具名", "arguments": {"参数名": "参数值"}}

示例：
用户: 北京天气怎么样？
助手: TOOL_CALL {"name": "get_weather", "arguments": {"location": "北京"}}

用户: 计算3的阶乘
助手: TOOL_CALL {"name": "calculate", "arguments": {"expression": "3的阶乘"}}

如果不需要工具，请直接回答。"""

                    full_prompt = f"{system_prompt}\n\n用户: {user_input}\n助手:"

                    print("🤔 思考中...", end="", flush=True)
                    ai_reply = self.ask_ollama(full_prompt)
                    print("\r" + " " * 30, end="\r")

                    # 解析工具调用
                    import re
                    pattern = r'TOOL_CALL\s*(\{.*?\})'
                    match = re.search(pattern, ai_reply, re.DOTALL)

                    if match:
                        try:
                            tool_call = json.loads(match.group(1))
                            tool_name = tool_call.get("name")
                            tool_args = tool_call.get("arguments", {})

                            print(f"🛠️  AI调用: {tool_name}")
                            result = await self.call_tool(tool_name, tool_args)
                            print(f"📊 结果:\n{result}")

                            # 生成最终回复
                            follow_up = f"用户说: {user_input}\n工具返回: {result}\n请根据结果回复用户。"
                            final_reply = self.ask_ollama(follow_up)
                            print(f"🤖 助手: {final_reply}")
                        except:
                            print(f"🤖 助手: {ai_reply}")
                    else:
                        print(f"🤖 助手: {ai_reply}")

                print("-" * 50)

            except KeyboardInterrupt:
                print("\n👋 再见！")
                break
            except Exception as e:
                print(f"❌ 错误: {str(e)}")

    async def run(self):
        """运行客户端"""
        connected = await self.connect()
        if not connected:
            return

        # 开始对话
        await self.chat_loop()

        # 关闭连接
        if self.writer:
            self.writer.close()
            await self.writer.wait_closed()


async def main():
    """主函数"""
    print("=" * 50)
    print("🚀 MCP TCP客户端启动")
    print("=" * 50)

    # 检查Ollama
    print("检查Ollama服务...")
    try:
        resp = requests.get("http://127.0.0.1:11434/api/tags", timeout=5)
        models = resp.json().get("models", [])
        if models:
            print(f"✅ Ollama正常，可用模型: {len(models)}个")
        else:
            print("⚠  Ollama中没有模型")
    except:
        print("⚠  Ollama可能未运行，但MCP工具仍可用")

    # 启动客户端
    client = MCPTCPClient(port=8000)
    await client.run()


if __name__ == "__main__":
    asyncio.run(main())