import 'expo-router/entry';
import {registerWidgetTaskHandler} from 'react-native-android-widget';
import {widgetTaskHandler} from './src/widget/widget-task-handler';
import {registerNotificationActions} from './src/notification-actions';
registerWidgetTaskHandler(widgetTaskHandler);
// Precisa ficar no escopo do módulo de entrada para funcionar com o app fechado.
registerNotificationActions();
