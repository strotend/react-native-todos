import React from "react";
import {
  EmitterSubscription,
  LayoutRectangle,
  Dimensions,
  Keyboard,
  Animated,
  ScrollView,
  View,
  Text
} from "react-native";

import { TodoType } from "app/types/TodoList";

import TodoTitle from "./TodoTitle";
import TodoListHeader from "./TodoListHeader";
import TodoListItem from "./TodoListItem";
import TodoListInput from "./TodoListInput";

interface PropsType {
  layout: LayoutRectangle;
  todos: TodoType[];
  storeTodos: (todos: TodoType[]) => any;
}

interface StateType {
  animHeight: Animated.Value;
  filter: string;
  todos: TodoType[];
}

export default class TodoList extends React.Component<PropsType, StateType> {
  public state = {
    animHeight: new Animated.Value(this.height),
    filter: "ALL",
    todos: this.props.todos
  };

  public keyboardWillShow: EmitterSubscription;
  public keyboardWillHide: EmitterSubscription;
  public todoListScroll: ScrollView;
  public scrollHeight = 0;
  public scrollTop = 0;

  public get screenHeight() {
    return Dimensions.get("window").height;
  }
  public get height() {
    return this.props.layout.height;
  }
  public get offsetTop() {
    return this.props.layout.y;
  }
  public get offsetBottom() {
    return this.screenHeight - this.offsetTop - this.height;
  }

  public get visibleTodos() {
    const { filter, todos } = this.state;
    switch (filter) {
      case "ACTIVE":
        return todos.filter(({ complete }) => !complete);
      case "COMPLETE":
        return todos.filter(({ complete }) => complete);
    }
    return todos;
  }

  public componentDidMount() {
    this.keyboardWillShow = Keyboard.addListener(
      "keyboardWillShow",
      this.handleKeyboardWillShow
    );
    this.keyboardWillHide = Keyboard.addListener(
      "keyboardWillHide",
      this.handleKeyboardWillHide
    );
  }

  public componentDidUpdate(prevProps, prevState) {
    if (prevProps.layout !== this.props.layout) {
      Animated.timing(this.state.animHeight, {
        toValue: this.height,
        duration: 125
      }).start();
    }
    if (prevState.todos !== this.state.todos) {
      this.props.storeTodos(this.state.todos);
    }
  }

  public componentWillUnmount() {
    this.keyboardWillShow.remove();
    this.keyboardWillHide.remove();
  }

  public render() {
    const { animHeight, filter, todos } = this.state;
    const complete = todos.length && todos.every(({ complete }) => complete);
    const activeCount = todos.filter(({ complete }) => !complete).length;

    const setScrollHeight = (width, height) => {
      this.scrollHeight = height;
    };
    const setScrollTop = event => {
      this.scrollTop = event.nativeEvent.contentOffset.y;
    };

    return (
      <Animated.View style={{ height: animHeight }}>
        <ScrollView
          ref={node => (this.todoListScroll = node)}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          stickyHeaderIndices={[1]}
          scrollEventThrottle={1}
          onContentSizeChange={setScrollHeight}
          onScroll={setScrollTop}
        >
          <TodoTitle />
          <TodoListHeader
            activeCount={activeCount}
            complete={complete}
            filter={filter}
            setFilter={this.setFilter}
            toggleTodos={this.toggleTodos}
            deleteCompleteTodos={this.deleteCompleteTodos}
          />
          <View style={{ flex: 1 }}>
            {this.visibleTodos.map(this.renderTodoListItem)}
            {!this.visibleTodos.length && <NoResult />}
          </View>
        </ScrollView>
        <TodoListInput createTodo={this.createTodo} />
      </Animated.View>
    );
  }

  private renderTodoListItem = todo => {
    return (
      <TodoListItem
        key={todo.id}
        todo={todo}
        deleteTodo={this.deleteTodo}
        updateTodo={this.updateTodo}
      />
    );
  };

  private handleKeyboardWillShow = event => {
    const todoListInputHeight = 50;
    const keyboardHeight = event.endCoordinates.height - this.offsetBottom;
    const enoughScrollHeight =
      this.height - todoListInputHeight < this.scrollHeight;
    let listenerId = null;
    if (enoughScrollHeight) {
      this.todoListScroll.scrollTo({ y: this.scrollTop + keyboardHeight });
    }
    Animated.timing(this.state.animHeight, {
      toValue: this.height - keyboardHeight,
      duration: event.duration
    }).start(() => this.state.animHeight.removeListener(listenerId));
    listenerId = this.state.animHeight.addListener(() => {
      if (!enoughScrollHeight) {
        this.todoListScroll.scrollToEnd({ animated: false });
      }
    });
  };

  private handleKeyboardWillHide = event => {
    const todoListInputHeight = 50;
    const keyboardHeight = event.endCoordinates.height - this.offsetBottom;
    const enoughScrollHeight =
      this.height - todoListInputHeight < this.scrollHeight - this.scrollTop;
    if (enoughScrollHeight) {
      this.todoListScroll.scrollTo({ y: this.scrollTop - keyboardHeight });
    }
    Animated.timing(this.state.animHeight, {
      toValue: this.height,
      duration: event.duration - 50
    }).start();
  };

  private setFilter = (filter: string) => {
    this.setState({ filter });
  };

  private toggleTodos = () => {
    const { todos } = this.state;
    const allTodosComplete = todos.every(({ complete }) => complete);
    this.setState({
      todos: todos.map(todo => ({
        ...todo,
        complete: !allTodosComplete
      }))
    });
  };

  private deleteCompleteTodos = () => {
    const { todos } = this.state;
    this.setState({
      todos: todos.filter(({ complete }) => !complete)
    });
  };

  private createTodo = title => {
    const { todos } = this.state;
    if (title) {
      const id = +new Date();
      this.setState({ todos: [...todos, { id, complete: false, title }] });
      setTimeout(this.todoListScroll.scrollToEnd);
    }
  };

  private deleteTodo = (todo: TodoType) => {
    const { todos } = this.state;
    this.setState({ todos: todos.filter(t => t.id !== todo.id) });
  };

  private updateTodo = (todo: TodoType, nextTodo) => {
    const { todos } = this.state;
    const todoIndex = todos.findIndex(t => t.id === todo.id);
    if (0 <= todoIndex) {
      this.setState({
        todos: [
          ...todos.slice(0, todoIndex),
          { ...todo, ...nextTodo },
          ...todos.slice(todoIndex + 1)
        ]
      });
    }
  };
}

function NoResult() {
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <Text
        style={{
          textAlign: "center",
          fontFamily: "NotoSansKR-Thin",
          fontSize: 20,
          color: "#aaa"
        }}
      >
        no result
      </Text>
    </View>
  );
}
