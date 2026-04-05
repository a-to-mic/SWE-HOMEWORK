# AI Agent 对话系统
一个基于 Model Context Protocol (MCP) 框架的 AI 助手服务器，通过标准 TCP 端口提供多种智能工具服务。支持天气查询、数学计算、系统监控、文件管理等实用功能，完全兼容 MCP 协议标准。

## 项目结构

```
mcp-ai-assistant/
├── mcp_tcp_server.py      # MCP TCP 服务器实现
├── mcp_tcp_client.py      # MCP TCP 客户端实现
├── requirements.txt       # 项目依赖
├── README.md             # 项目文档
└── examples/             # 示例代码
    ├── simple_client.py  # 简单客户端示例
    └── test_connection.py # 连接测试工具
```

## 环境要求

- Python 3.8+
- 网络连接（用于天气查询）

### 安装依赖
```
# 克隆仓库
git clone https://github.com/yourusername/mcp-ai-assistant.git
cd mcp-ai-assistant

# 安装依赖
pip install asyncio requests psutil
```

## 启动服务器
```
# 启动 MCP TCP 服务器
python mcp_tcp_server.py
```

### 服务器将在 127.0.0.1:8000启动，您将看到以下输出：
```
MCP TCP服务器已启动，监听 127.0.0.1:8000
可用工具:
  - get_weather: 获取天气信息
  - calculate: 计算数学表达式
  - get_time: 获取当前时间
  - system_info: 获取系统信息
  - list_files: 列出目录文件
  - what_can_you_do: 查看助手功能
```

## 启动客户端
```
# 在另一个终端中启动客户端
python mcp_tcp_client.py
```

## 使用示例
### 天气查询
```
你: 北京天气怎么样？
助手: 北京天气: 北京: ☀️ 13°C
```

### 数学计算
```
你: 计算2的3次方
助手: 2的3次方 = 8
```

### 系统监控
```
你: 查看系统状态
助手: CPU: 15.5%, 内存: 45.2%
```

## 架构设计
###
```
用户输入 → 客户端 → TCP连接(8000端口) → 服务器 → 工具处理 → 返回结果
```

## 核心代码片段
### 服务器启动代码
```
async def main():
    """启动MCP TCP服务器"""
    server = MCPTCPServer(port=8000)
    try:
        await server.start()
    except KeyboardInterrupt:
        print("服务器被用户中断")
    except Exception as e:
        print(f"服务器错误: {e}")
```

### 工具注册机制
```
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
        # ... 其他工具注册
    }
```

