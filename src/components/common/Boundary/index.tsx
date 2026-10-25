import { Result } from 'antd';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import errorImg from 'src/assets/images/common-icon/errorPage.png';
import { Button } from 'antd';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    console.log('error (getDerivedStateFromError):', _);
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.log('error (componentDidCatch):', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          title="Có lỗi xảy ra!"
          subTitle="Hệ thống xảy ra lỗi, vui lòng tải lại trang để tiếp tục sử dụng!"
          icon={<img src={errorImg} alt="error" width={400} />}
          extra={
            <div className="d-flex justify-content-center">
              <Button type="primary" onClick={() => window.location.reload()}>
                Tải lại trang
              </Button>
            </div>
          }
        />
      );
    }

    return this.props.children;
  }
}
